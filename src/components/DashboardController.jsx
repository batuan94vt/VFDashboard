import { useEffect } from "react";
import { api } from "../services/api";
import { useStore } from "@nanostores/react";
import {
  fetchTelemetry,
  fetchUser,
  fetchVehicles,
  vehicleStore,
} from "../stores/vehicleStore";

export default function DashboardController({ vin: initialVin }) {
  const { vin } = useStore(vehicleStore);

  useEffect(() => {
    const init = async () => {
      let targetVin = initialVin || vin;

      // Ensure we have User profile
      fetchUser();

      // If no VIN, fetch it
      if (!targetVin) {
        targetVin = await fetchVehicles();
      }

      // If still no VIN or failed to fetch, redirect to login
      if (!targetVin) {
        console.warn(
          "No vehicle found or init failed. Clearing session and redirecting.",
        );
        api.clearSession();
        window.location.href = "/login";
        return;
      }

      // Initial telemetry fetch
      if (targetVin) {
        fetchTelemetry(targetVin);
      }
    };

    init();
  }, [initialVin]); // Only run on load or if SSR vin changes

  // Polling Effect
  useEffect(() => {
    // Polling Interval: 1 hour (3600000 ms)
    const interval = setInterval(() => {
      const currentVin = vin || initialVin;
      if (currentVin) {
        fetchTelemetry(currentVin);
        fetchUser(); // Refresh user too
      }
    }, 3600000);

    return () => clearInterval(interval);
  }, [vin, initialVin]);

  return null; // Headless
}
