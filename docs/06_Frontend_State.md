# Frontend State Management

## Overview
The frontend uses **Nano Stores** (`nanostores`) for lightweight, framework-agnostic state management. The central store is `vehicleStore`, which holds the "Digital Twin" state of the vehicle.

## 1. Store Structure (`vehicleStore.ts`)
Location: `src/stores/vehicleStore.ts`

The `vehicleStore` is a mapped store containing:

### 1.1 Core Vehicle Logic
*   `vin`: Vehicle Identification Number (Primary Key).
*   `model`, `trim`, `color`: Static vehicle attributes.
*   `battery_level`: HV Battery %.
*   `range`: Remaining kilometers.
*   `charging_status`: Charging boolean/enum.

### 1.2 Location & Environment
*   `latitude`, `longitude`: Current GPS position.
*   `location_address`: Reverse-geocoded address (added by Backend).
*   `outside_temp`: From Telemetry or Open-Meteo.
*   `weather_code`: Weather condition code (for UI icons).

### 1.3 Detailed Status (Glossary)
The store flattens mapped telemetry keys for easier UI consumption:
*   `tire_pressure_*`: Tire pressures (Bar).
*   `tire_temp_*`: Tire temperatures (C).
*   `door_*`: Door open/closed boolean.
*   `bms_version`, `mhu_version`: ECU Versions.

## 2. State flow

### 2.1 Initialization
1.  `DashboardController.jsx` mounts and calls `fetchVehicles()`.
2.  `fetchVehicles()` hits `/api/vehicles`, retrieves the VIN, and populates static data (User Avatar, Vehicle Model).
3.  It sets the `vin` atom in the store.

### 2.2 Telemetry Polling
1.  Once `vin` is set, `fetchTelemetry(vin)` is called.
2.  It hits `/api/telemetry/{vin}` (BFF).
3.  The BFF retrieves data from VinFast + External Services (Weather/Geo).
4.  The JSON response is merged into `vehicleStore` using `updateVehicleData()`.
5.  **Reactivity**: Any React component listening to `usedStore(vehicleStore)` automatically re-renders with new data.

## 3. Auth Store (`authStore.ts`)
A simple atom-based store for user session context:
*   `isAuthenticated`: Boolean atom.
*   `userRegion`: "us", "vn", or "eu".

## 4. Best Practices
*   **Direct Access**: Use `vehicleStore.get()` for non-reactive reads (e.g., inside functions).
*   **Reactive Access**: Use `useStore(vehicleStore)` in React components.
*   **Updates**: Always use `updateVehicleData()` helper to ensure `lastUpdated` timestamp is refreshed.
