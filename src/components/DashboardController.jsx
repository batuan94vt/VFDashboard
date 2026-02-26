import { useEffect, useRef } from "react";
import { api } from "../services/api";
import {
  fetchTelemetry,
  fetchUser,
  fetchVehicles,
  vehicleStore,
  updateFromMqtt,
} from "../stores/vehicleStore";
import { fetchChargingSessions } from "../stores/chargingHistoryStore";
import { REFRESH_INTERVAL } from "../stores/refreshTimerStore";
import { getMqttClient, destroyMqttClient } from "../services/mqttClient";
import { mqttStore } from "../stores/mqttStore";
import { CORE_TELEMETRY_ALIASES } from "../config/vinfast";
import staticAliasMap from "../config/static_alias_map.json";

// Fallback polling interval when MQTT is connected (30 minutes)
const MQTT_FALLBACK_INTERVAL = 30 * 60 * 1000;

export default function DashboardController({ vin: initialVin }) {
  const isMounted = useRef(true);
  const pollingInFlight = useRef(false);

  // Init Effect
  useEffect(() => {
    isMounted.current = true;

    // Set MQTT callbacks EARLY — before fetchVehicles which triggers
    // switchVehicle → switchVin → connect(). Without this, MQTT connects
    // but onTelemetryUpdate/onConnected are null so messages are ignored
    // and registerResources is never called.
    const mqttClient = getMqttClient();
    mqttClient.onTelemetryUpdate = (mqttVin, parsed, rawMessages) => {
      if (isMounted.current) {
        updateFromMqtt(mqttVin, parsed, rawMessages);
      }
    };
    mqttClient.onConnected = (connectedVin) => {
      if (!isMounted.current) return;
      api.registerResources(connectedVin, buildCoreResources());
    };

    const init = async () => {
      let targetVin = initialVin || vehicleStore.get().vin;

      await fetchUser();
      if (!isMounted.current) return;

      // If no VIN, fetch it
      if (!targetVin) {
        // fetchVehicles calls switchVehicle → switchVin → connect (MQTT starts here)
        targetVin = await fetchVehicles();
        if (!isMounted.current) return;
      } else {
        // If VIN was passed via props/initial state, ensure we have initial telemetry
        await fetchTelemetry(targetVin);
        if (!isMounted.current) return;
      }

      if (targetVin) {
        // Preload full charging history for dashboard stats.
        void fetchChargingSessions(targetVin);
      }

      // If still no VIN or failed to fetch, redirect to login
      if (!targetVin && isMounted.current) {
        console.warn(
          "No vehicle found or init failed. Clearing session and redirecting.",
        );
        api.clearSession();
        window.location.href = "/login";
        return;
      }

      // Start MQTT if not already started by switchVehicle
      if (targetVin && isMounted.current) {
        const mqttState = mqttStore.get();

        const shouldStartMqtt =
          mqttClient.vin !== targetVin ||
          (mqttState.status !== "connected" && mqttState.status !== "connecting");

        if (shouldStartMqtt) {
          mqttClient.connect(targetVin);
        }
      }
    };

    init();

    return () => {
      isMounted.current = false;
      destroyMqttClient();
    };
  }, [initialVin]);

  // Polling Effect — reactive to MQTT status changes
  useEffect(() => {
    let interval = null;

    const poll = async () => {
      const currentVin = vehicleStore.get().vin || initialVin;
      if (!currentVin || pollingInFlight.current || !isMounted.current) return;

      pollingInFlight.current = true;
      try {
        await fetchTelemetry(currentVin);
      } finally {
        pollingInFlight.current = false;
      }
    };

    const setupPolling = () => {
      if (interval) clearInterval(interval);
      const mqttConnected = mqttStore.get().status === "connected";
      const intervalMs = mqttConnected ? MQTT_FALLBACK_INTERVAL : REFRESH_INTERVAL;
      interval = setInterval(() => poll(), intervalMs);
    };

    setupPolling();

    // Re-evaluate polling interval when MQTT status changes
    const unsubscribe = mqttStore.subscribe(setupPolling);

    return () => {
      if (interval) clearInterval(interval);
      unsubscribe();
    };
  }, [initialVin]);

  return null; // Headless
}

// Build core resource list for list_resource registration
function buildCoreResources() {
  const resources = [];
  CORE_TELEMETRY_ALIASES.forEach((alias) => {
    const m = staticAliasMap[alias];
    if (m) {
      resources.push({
        objectId: m.objectId,
        instanceId: m.instanceId,
        resourceId: m.resourceId,
      });
    }
  });
  return resources;
}
