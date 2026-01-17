# System Data Flow Documentation

This document describes the current implementation flow for Authentication, Vehicle Discovery, and Telemetry Retrieval in the VinFast Dashboard.

## 1. Authentication Flow (Login)

The authentication process bridges the Frontend, Backend, and VinFast's Auth0 Identity Provider.

1.  **User Input**: User enters `email` and `password` on the Dashboard Login page (`/login`).
2.  **API Request**: Frontend sends a POST request to `http://localhost:3000/api/login`.
3.  **Backend Processing** (`server.js` -> `vinfast.js`):
    *   The `VinFastAPI.authenticate(email, password)` method is called.
    *   It sends a request to VinFast's Auth0 endpoint (`https://vinfast-id.auth0.com/oauth/token`) with the User's credentials and the `ha-vinfast-integration` client ID.
4.  **Token Issuance**:
    *   Auth0 validates credentials and returns an `access_token` and `refresh_token`.
5.  **Session Creation**:
    *   The Backend sets the `access_token` as an **HTTP-Only Cookie** in the response.
    *   Frontend redirects user to the Dashboard (`/`).

## 2. Token Refresh Flow
The system implements a strategy to handle expired Access Tokens (`401 Unauthorized`) gracefully without forcing the user to log in again immediately.

1.  **Trigger**: An API call (e.g., `getVehicles` or `getTelemetry`) returns a `401` status.
2.  **Refresh Logic**:
    *   The backend checks for a valid `refresh_token` in the session.
    *   It sends a POST request to `https://{auth0_domain}/oauth/token` with `grant_type: refresh_token`.
3.  **Outcome**:
    *   **Success (200)**: Auth0 returns a new `access_token`. The backend updates the session and retries the original failed request.
    *   **Failure (401/403)**: The `refresh_token` is exhausted or invalid. The backend clears the session and returns `401` to the Frontend.
4.  **Frontend Handling**: Frontend receives the final `401` and redirects the user to `/login`.

## 2. Vehicle Discovery Flow

Once authenticated, the system discovers the user's vehicles.

1.  **Frontend Init**: On load, `index.astro` calls `http://localhost:3000/api/vehicles`.
2.  **Backend Request**:
    *   `VinFastAPI.getVehicles()` is executed using the `access_token` from the cookie.
    *   It calls the VinFast API: `/ccarusermgnt/api/v1/user-vehicle`.
3.  **Data Extraction**:
    *   The API returns a list of vehicles.
    *   The Backend extracts the Primary **VIN** (`vinCode`) and **UserID**.
4.  **Response**: The list of vehicles is returned to the Frontend. The Frontend usually defaults to the first vehicle.

## 3. Telemetry Retrieval Flow

This is the most complex part, involving mapping human-readable "Aliases" to technical "Device IDs".

### A. Alias Mapping (One-time Setup)
Before fetching data, the backend must map "Names" to "IDs".

1.  **Fetch Map**: `VinFastAPI.getAliasMappings()` calls `/modelmgmt/api/v2/.../get-alias`.
2.  **Parse Response**: The API returns a list of resources, e.g.:
    *   Alias: `VEHICLE_STATUS_HV_BATTERY_SOC`
    *   ID: `34183/1/9`
3.  **Tech Reference Override**:
    *   Critical step: The code **manually enforces** mappings from `docs/03_API_Reference.md` for items known to be inconsistent in the public API (e.g., Tire Temperatures, Pet Mode).
    *   *Example*: Force maps `VEHICLE_STATUS_FRONT_LEFT_TIRE_PRESSURE` to `34183/1/16`.

### B. Fetching Telemetry
1.  **Frontend Poll**: `DashboardController.jsx` calls `http://localhost:3000/api/telemetry/{vin}`.
2.  **Construct Payload**:
    *   Backend reads `CORE_TELEMETRY_ALIASES` from `config.js`.
    *   It looks up the corresponding IDs (`ObjectId`, `InstanceId`, `ResourceId`) for each alias in the map created above.
    *   A JSON payload of these IDs is constructed.
3.  **API Call**: Backend POSTs this payload to `/ccaraccessmgmt/api/v1/telemetry/app/ping`.
4.  **Raw Data Response**: VinFast returns the current values for these IDs.
    *   *Format*: `[{ deviceKey: "34183_1_9", value: "88" }, ...]`

### C. Data Translation
1.  **Mapping Back**: `_parseTelemetry` translates the raw `deviceKey` back to a friendly `vehicleStore` key.
    *   It uses a `keyMap` dictionary (e.g., `VEHICLE_STATUS_HV_BATTERY_SOC` -> `battery_level`).
2.  **Fallback Path**: If an Alias isn't found, it checks a direct path map (e.g., `/34183/1/7` -> `outside_temp`).
3.  **Unit & Logic Fixes**:
    *   Converts strings to numbers.
    *   Applies boolean logic (e.g., Lock Status `1` -> `true`).
4.  **Final Response**: The normalized JSON (e.g., `{ battery_level: 88, outside_temp: 28 }`) is sent to the Frontend to update the UI.
