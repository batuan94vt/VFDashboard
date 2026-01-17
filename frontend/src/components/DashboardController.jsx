import { useEffect } from "react";
import {
  fetchTelemetry,
  fetchUser,
  fetchVehicles,
} from "../stores/vehicleStore";

export default function DashboardController({ vin }) {
  useEffect(() => {
    const init = async () => {
      let targetVin = vin;

      // If no VIN passed (SSR failed), fetch client-side
      if (!targetVin) {
        targetVin = await fetchVehicles();
      }

      if (targetVin) {
        fetchTelemetry(targetVin);
      }
      fetchUser();
    };

    init();

    // Polling Interval: 1 hour (3600000 ms)
    const interval = setInterval(() => {
      if (vin) fetchTelemetry(vin);
    }, 3600000);

    return () => clearInterval(interval);
  }, [vin]);

  return null; // Headless
}
