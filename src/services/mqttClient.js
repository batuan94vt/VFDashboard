import mqtt from "mqtt";
import { MQTT_CONFIG, DEFAULT_REGION } from "../config/vinfast";
import { parseTelemetry } from "../utils/telemetryMapper";
import { setMqttStatus, recordMqttMessage } from "../stores/mqttStore";
import staticAliasMap from "../config/static_alias_map.json";

// --- SigV4 URL Signing (Web Crypto API, no dependencies) ---

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key, message) {
  const keyData = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const msgData = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, msgData));
}

async function sha256(message) {
  const data = new TextEncoder().encode(message);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

async function getSignatureKey(key, dateStamp, region, service) {
  let kDate = await hmacSha256("AWS4" + key, dateStamp);
  let kRegion = await hmacSha256(kDate, region);
  let kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

/**
 * Generate a SigV4-signed WebSocket URL for AWS IoT Core MQTT.
 */
async function signMqttWebSocketUrl(endpoint, region, credentials) {
  const expiresIn = 86400; // 24 hours
  const service = "iotdevicegateway";
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate =
    dateStamp +
    "T" +
    now.toISOString().slice(11, 19).replace(/:/g, "") +
    "Z";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalQueryParts = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credentials.accessKeyId + "/" + credentialScope)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`,
  ];

  canonicalQueryParts.sort();
  const canonicalQueryString = canonicalQueryParts.join("&");

  const canonicalRequest = [
    "GET",
    "/mqtt",
    canonicalQueryString,
    `host:${endpoint}`,
    "",
    "host",
    await sha256(""),
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(
    credentials.secretAccessKey,
    dateStamp,
    region,
    service,
  );

  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const signedUrl = `wss://${endpoint}/mqtt?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  if (credentials.sessionToken) {
    // AWS IoT Core WebSocket quirk: session token must be sent after signature and
    // is intentionally not part of the SigV4 canonical query string.
    return `${signedUrl}&X-Amz-Security-Token=${encodeURIComponent(
      credentials.sessionToken,
    )}`;
  }

  return signedUrl;
}

// --- MQTT Telemetry Client ---

function buildDeviceKeyToAlias(aliasMap) {
  const pathToAlias = {};
  for (const [alias, mapping] of Object.entries(aliasMap)) {
    if (mapping && mapping.objectId != null) {
      const path = `/${mapping.objectId}/${mapping.instanceId}/${mapping.resourceId}`;
      pathToAlias[path] = alias;
    }
  }
  return pathToAlias;
}

export class MqttTelemetryClient {
  constructor() {
    this.client = null;
    this.vin = null;
    this.credentials = null;
    this.credentialExpiry = 0;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.onTelemetryUpdate = null;
    this.onConnected = null;
    this.pathToAlias = buildDeviceKeyToAlias(staticAliasMap);
    this._destroyed = false;
    this._connectToken = 0;
  }

  async connect(vin) {
    const connectToken = ++this._connectToken;
    if (this._destroyed) return;
    if (this.client && this.vin === vin && this.client.connected) return;

    if (this.client) {
      this._cleanup();
    }

    this.vin = vin;
    setMqttStatus("connecting");

    try {
      await this._ensureCredentials();

      const mqttConfig = MQTT_CONFIG[DEFAULT_REGION] || MQTT_CONFIG.vn;
      await this._createClient(vin, mqttConfig.endpoint, mqttConfig, connectToken, true);
    } catch (e) {
      console.error("[MQTT] Connection failed:", e);
      setMqttStatus("error", e.message);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    const token = this._connectToken;

    if (this._destroyed || !this.vin) return;
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this._connectToken !== token || this._destroyed || !this.vin) return;

      console.log("[MQTT] Attempting reconnect...");
      setMqttStatus("connecting");

      // Clean up old client
      if (this.client) {
        try {
          this.client.end(true);
        } catch {}
        this.client = null;
      }

      // Reconnect with fresh signed URL
      try {
        if (this._connectToken !== token || this._destroyed || !this.vin) return;

        await this._ensureCredentials();
        const mqttConfig = MQTT_CONFIG[DEFAULT_REGION] || MQTT_CONFIG.vn;
        const vin = this.vin;
        await this._createClient(vin, mqttConfig.endpoint, mqttConfig, token, false);
      } catch (e) {
        console.error("[MQTT] Reconnect failed:", e);
        setMqttStatus("error", e.message);
        this._scheduleReconnect();
      }
    }, 5000);
  }

  disconnect() {
    this._connectToken += 1;
    this._destroyed = true;
    this._cleanup();
    this.onConnected = null;
    setMqttStatus("disconnected");
  }

  _cleanup() {
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      try {
        this.client.removeAllListeners();
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.vin = null;
  }

  destroy() {
    this.disconnect();
  }

  async switchVin(newVin) {
    // Fast path: already connected to this VIN
    if (this.vin === newVin && this.client?.connected) return;

    const connectToken = ++this._connectToken;
    this._destroyed = false;

    // Stop heartbeat + clear reconnect timer (but don't null vin yet)
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Destroy old client
    if (this.client) {
      try {
        this.client.removeAllListeners();
        this.client.end(true);
      } catch {}
      this.client = null;
    }

    this.vin = newVin;
    setMqttStatus("connecting");

    try {
      await this._ensureCredentials(); // Reuses cached creds (fast path)
      const mqttConfig = MQTT_CONFIG[DEFAULT_REGION] || MQTT_CONFIG.vn;
      await this._createClient(newVin, mqttConfig.endpoint, mqttConfig, connectToken, false);
    } catch (e) {
      console.error("[MQTT] Switch failed:", e);
      setMqttStatus("error", e.message);
      this._scheduleReconnect();
    }
  }

  async _ensureCredentials() {
    const now = Date.now();
    if (this.credentials && this.credentialExpiry > now + 300000) {
      return;
    }

    const response = await fetch("/api/mqtt-credentials", {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const json = JSON.parse(text);
        detail = json?.error || json?.message || text;
      } catch {
        // keep raw text
      }
      throw new Error(
        `Failed to get MQTT credentials (${response.status}): ${detail || "no body"}`,
      );
    }

    const data = await response.json();
    if (data?.status === 412 || data?.policyAttached === false) {
      throw new Error(
        `MQTT policy attachment failed: ${data.policyMessage || "unknown"}`,
      );
    }
    const token = (data.sessionToken || "").trim();
    if (!data.accessKeyId || !data.secretAccessKey || !token) {
      throw new Error("Invalid MQTT credentials from server");
    }

    this.credentials = {
      accessKeyId: data.accessKeyId,
      secretAccessKey: data.secretAccessKey,
      sessionToken: token,
      identityId: data.identityId,
    };
    let expirationMs = NaN;
    if (typeof data.expiration === "number") {
      // AWS can return Unix epoch seconds.
      expirationMs =
        data.expiration > 1e12 ? data.expiration : data.expiration * 1000;
    } else if (typeof data.expiration === "string") {
      // Backward compatibility with ISO timestamp.
      expirationMs = Date.parse(data.expiration);
    }

    this.credentialExpiry = Number.isFinite(expirationMs)
      ? expirationMs
      : now + 3600000;
  }

  async _createClient(vin, mqttHost, mqttConfig, connectToken, isInitialConnect) {
    const url = await signMqttWebSocketUrl(
      mqttHost,
      mqttConfig.region,
      this.credentials,
    );
    const clientId = vin.substring(0, 20);

    // Disable auto-reconnect — we handle it manually to support async URL signing.
    this.client = mqtt.connect(url, {
      clientId,
      clean: true,
      keepalive: mqttConfig.keepAlive || 300,
      reconnectPeriod: 0,
      connectTimeout: 15000,
      protocolVersion: 4,
    });

    const onConnect = () => {
      if (this._connectToken !== connectToken || this._destroyed) return;
      console.log(
        `[MQTT] ${isInitialConnect ? "Connected" : "Reconnected"} to`,
        mqttHost,
      );
      setMqttStatus("connected");
      this._subscribe(vin);
      this._startHeartbeat(vin, connectToken);
      if (typeof this.onConnected === "function") {
        console.log(`[MQTT] onConnected callback for ${vin}`);
        this.onConnected(vin);
      }
    };

    this.client.on("connect", onConnect);

    this.client.on("message", (topic, payload) => {
      if (this._connectToken !== connectToken || this._destroyed) return;
      this._onMessage(topic, payload);
    });

    this.client.on("error", (err) => {
      if (this._connectToken !== connectToken || this._destroyed) return;
      console.error(`[MQTT] ${isInitialConnect ? "Error" : "Reconnect error"}:`, err.message);
      setMqttStatus("error", err.message);
    });

    this.client.on("disconnect", (packet) => {
      if (this._connectToken !== connectToken || this._destroyed) return;
      const reason = packet && typeof packet === "object" ? packet.reasonCode : null;
      console.warn("[MQTT] Disconnect packet:", reason);
      setMqttStatus("disconnected");
      this._stopHeartbeat();
      this._scheduleReconnect();
    });

    this.client.on("offline", () => {
      if (this._connectToken !== connectToken || this._destroyed) return;
      console.warn("[MQTT] Client offline");
      setMqttStatus("disconnected");
    });

    this.client.on("close", (ev) => {
      if (this._connectToken !== connectToken || this._destroyed) return;
      if (!this._destroyed) {
        console.log("[MQTT] Connection closed", {
          code: ev?.code,
          reason: ev?.reason,
          wasClean: ev?.wasClean,
          state: ev?.type,
        });
        setMqttStatus("disconnected");
        this._stopHeartbeat();
        this._scheduleReconnect();
      }
    });

    if (this.client.stream && this.client.stream.addEventListener) {
      this.client.stream.addEventListener("close", (ev) => {
        if (this._connectToken !== connectToken || this._destroyed) return;
        console.warn(
          `[MQTT] ${isInitialConnect ? "Native WS close" : "Reconnect native WS close"}`,
          "code",
          ev?.code,
          "reason",
          ev?.reason,
          "wasClean",
          ev?.wasClean,
        );
      });

      this.client.stream.addEventListener("error", (ev) => {
        if (this._connectToken !== connectToken || this._destroyed) return;
        console.error("[MQTT] Native WS error:", ev);
      });
    }

    return this.client;
  }

  _getTopics(vin) {
    return [
      `/mobile/${vin}/push`,
      `monitoring/server/${vin}/push`,
      `/server/${vin}/remctrl`,
    ];
  }

  _subscribe(vin) {
    if (!this.client) return;

    this._getTopics(vin).forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Subscribe failed for ${topic}:`, err);
        } else {
          console.log(`[MQTT] Subscribed to ${topic}`);
        }
      });
    });
  }

  _unsubscribe(vin) {
    if (!this.client) return;

    this._getTopics(vin).forEach((topic) => {
      this.client.unsubscribe(topic, (err) => {
        if (err) {
          console.warn(`[MQTT] Unsubscribe failed for ${topic}:`, err);
        }
      });
    });
  }

  _startHeartbeat(vin, connectToken) {
    this._stopHeartbeat();
    const mqttConfig = MQTT_CONFIG[DEFAULT_REGION] || MQTT_CONFIG.vn;
    const interval = mqttConfig.heartbeatInterval || 120000;
    const heartbeatToken = connectToken || this._connectToken;

    const sendHeartbeat = (state) => {
      if (
        !this.client ||
        !this.client.connected ||
        this._connectToken !== heartbeatToken ||
        this._destroyed
      ) {
        return;
      }

      const topic = `/vehicles/${vin}/push/connected/heartbeat`;
      const payload = JSON.stringify({
        version: "1.2",
        timestamp: Date.now(),
        trans_id: crypto.randomUUID(),
        content: {
          "34183": { "1": { "54": String(state) } },
        },
      });

      this.client.publish(topic, payload, { qos: 0 }, (err) => {
        if (!err) return;
        console.warn("[MQTT] Heartbeat publish failed:", err?.message || err);
        this._stopHeartbeat();
        this._scheduleReconnect();
      });
    };

    sendHeartbeat(2);
    let toggle = false;
    this.heartbeatTimer = setInterval(() => {
      toggle = !toggle;
      sendHeartbeat(toggle ? 1 : 2);
    }, interval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _onMessage(topic, payload) {
    try {
      const topicVin = this._extractVinFromTopic(topic);
      if (this._destroyed || (topicVin && this.vin && topicVin !== this.vin)) {
        return;
      }

      const text = payload.toString();

      const safeParse = (value) => {
        if (typeof value !== "string") return value;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      };

      const extractMessages = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw.messages)) return raw.messages;
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.payloads)) return raw.payloads;
        if (Array.isArray(raw.body)) return raw.body;
        if (Array.isArray(raw.data?.data)) return raw.data.data;

        // Handle nested payload/message bodies encoded as JSON strings.
        const parsedPayload = safeParse(raw.payload);
        if (Array.isArray(parsedPayload)) return parsedPayload;
        if (parsedPayload) {
          const nested = extractMessages(parsedPayload);
          if (nested.length) return nested;
        }

        const parsedMessage = safeParse(raw.message);
        if (Array.isArray(parsedMessage)) return parsedMessage;
        if (parsedMessage) {
          const nestedMessage = extractMessages(parsedMessage);
          if (nestedMessage.length) return nestedMessage;
        }

        return [raw];
      };

      let messages;
      try {
        const parsed = safeParse(text);
        messages = extractMessages(parsed);
      } catch {
        console.warn(
          "[MQTT] Non-JSON message on",
          topic,
          text.substring(0, 100),
        );
        return;
      }

      const telemetryMessages = messages
        .map((m) => {
          if (!m || typeof m !== "object") return null;

          let deviceKey =
            m.deviceKey || m.device_key || m.path || m.deviceId || m.device_id;
          if (!deviceKey && m.objectId != null && m.instanceId != null && m.resourceId != null) {
            deviceKey = `${m.objectId}/${m.instanceId}/${m.resourceId}`;
          }

          if (typeof deviceKey === "string" && deviceKey.includes("/")) {
            const parts = deviceKey.split("/").filter(Boolean);
            if (parts.length === 3) {
              deviceKey = `${parts[0]}_${parts[1]}_${parts[2]}`;
            }
          }
          if (!deviceKey) return null;
          if (deviceKey === m.deviceKey) return m;
          return { ...m, deviceKey };
        })
        .filter(Boolean);
      if (telemetryMessages.length === 0) return;

      recordMqttMessage();

      const parsed = parseTelemetry(telemetryMessages, this.pathToAlias);

      if (Object.keys(parsed).length > 0 && this.onTelemetryUpdate) {
        this.onTelemetryUpdate(this.vin, parsed);
      }
    } catch (e) {
      console.error("[MQTT] Message parse error:", e);
    }
  }

  _extractVinFromTopic(topic) {
    if (!topic) return null;

    const parts = String(topic).split("/").filter(Boolean);
    if (parts.length < 2) return null;

    if (parts[0] === "mobile" && parts.length >= 2) return parts[1] ?? null;
    if (
      parts[0] === "monitoring" &&
      parts[1] === "server" &&
      parts.length >= 3
    ) {
      return parts[2] ?? null;
    }
    if (parts[0] === "server" && parts.length >= 2) return parts[1] ?? null;

    return null;
  }
}

// Singleton
let mqttClientInstance = null;

export function getMqttClient() {
  if (!mqttClientInstance) {
    mqttClientInstance = new MqttTelemetryClient();
  }
  return mqttClientInstance;
}

export function destroyMqttClient() {
  if (mqttClientInstance) {
    mqttClientInstance.destroy();
    mqttClientInstance = null;
  }
}
