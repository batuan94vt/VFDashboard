const {
  REGIONS,
  DEFAULT_REGION,
  CORE_TELEMETRY_ALIASES,
  FALLBACK_TELEMETRY_RESOURCES,
  STATIC_ALIAS_MAP,
  API_HEADERS,
} = require("./config");
const { parseTelemetry } = require("./telemetryMapper");

class VinFastAPI {
  constructor(region = DEFAULT_REGION, state = {}) {
    this.region = region;
    this.regionConfig = REGIONS[region] || REGIONS[DEFAULT_REGION];

    // Initialize from passed state (Stateless)
    this.accessToken = state.accessToken || null;
    this.refreshToken = state.refreshToken || null;
    this.vin = state.vin || null;
    this.userId = state.userId || null;

    this.aliasMappings = STATIC_ALIAS_MAP; // Initialize with Hardcoded Map
  }

  _getHeaders() {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }
    const headers = {
      ...API_HEADERS,
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (this.vin) headers["x-vin-code"] = this.vin;
    if (this.userId) headers["x-player-identifier"] = this.userId;
    return headers;
  }

  async authenticate(email, password) {
    const url = `https://${this.regionConfig.auth0_domain}/oauth/token`;
    const payload = {
      client_id: this.regionConfig.auth0_client_id,
      audience: this.regionConfig.auth0_audience,
      grant_type: "password",
      scope: "offline_access openid profile email",
      username: email,
      password: password,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Authentication failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;

      // Persist Session - REMOVED (Stateless)
      // saveSession({ ... });

      return {
        access_token: this.accessToken,
        refresh_token: this.refreshToken,
      };
    } catch (error) {
      console.error("Auth Error:", error);
      throw error;
    }
  }

  async getVehicles() {
    const url = `${this.regionConfig.api_base}/ccarusermgnt/api/v1/user-vehicle`;
    // Retry logic handled manually here for clarity or use helper
    const response = await this._fetchWithRetry(url, {
      headers: this._getHeaders(),
    });
    const json = await response.json();

    if (json.data && json.data.length > 0) {
      this.vin = json.data[0].vinCode;
      this.userId = json.data[0].userId;

      // Update Session with VIN - REMOVED (Stateless)
      // saveSession({ ... });
    }
    return json.data || [];
  }

  async getUserProfile() {
    const url = `https://${this.regionConfig.auth0_domain}/userinfo`;
    const response = await this._fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    return await response.json();
  }

  async getTelemetry(vin) {
    if (vin) this.vin = vin;
    if (!this.vin) throw new Error("VIN is required");

    const requestObjects = [];
    const pathToAlias = {};

    // Prioritize CORE aliases from Config/Tech Ref
    CORE_TELEMETRY_ALIASES.forEach((alias) => {
      if (this.aliasMappings[alias]) {
        const m = this.aliasMappings[alias];
        requestObjects.push({
          objectId: m.objectId,
          instanceId: m.instanceId,
          resourceId: m.resourceId,
        });
        // Construct path in format that matches API response (zero-padded)
        const path = `/${m.objectId}/${m.instanceId}/${m.resourceId}`;
        pathToAlias[path] = alias;
      } else {
        // Try fallback if alias missing but we have hardcoded paths in FALLBACK
      }
    });

    // Also check FALLBACK list just in case
    FALLBACK_TELEMETRY_RESOURCES.forEach((path) => {
      const parts = path.split("/").filter((p) => p);
      if (parts.length === 3) {
        // Only add if not already added via alias
        const exists = requestObjects.find(
          (r) =>
            r.objectId == parts[0] &&
            r.instanceId == parts[1] &&
            r.resourceId == parts[2],
        );
        if (!exists) {
          requestObjects.push({
            objectId: parts[0],
            instanceId: parts[1],
            resourceId: parts[2],
          });
        }
      }
    });

    if (requestObjects.length === 0)
      console.error("DEBUG: Zero telemetry objects requested!");

    const url = `${this.regionConfig.api_base}/ccaraccessmgmt/api/v1/telemetry/app/ping`;
    const response = await this._fetchWithRetry(url, {
      method: "POST",
      headers: this._getHeaders(),
      body: JSON.stringify(requestObjects),
    });

    const json = await response.json();
    return parseTelemetry(json.data, pathToAlias);
  }

  async refreshAccessToken() {
    if (!this.refreshToken) return false;

    console.log("Attempting to refresh access token...");
    const url = `https://${this.regionConfig.auth0_domain}/oauth/token`;
    const payload = {
      client_id: this.regionConfig.auth0_client_id,
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("Token refresh failed:", response.status);
        return false;
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Some providers rotate refresh tokens, some don't. Update if provided.
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token; // v1.MR2AY0...
      }

      // saveSession({ ... });

      console.log("Token refreshed successfully.");
      return true;
    } catch (err) {
      console.error("Error refreshing token:", err);
      return false;
    }
  }

  async _fetchWithRetry(url, options) {
    let response = await fetch(url, options);

    if (response.status === 401) {
      console.warn("Received 401. Trying to refresh token...");
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        if (options.headers) {
          options.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        response = await fetch(url, options);
      }
    }
    return response;
  }
}

module.exports = VinFastAPI;
