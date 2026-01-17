# VinFast Dashboard - API Reference
**Version:** 1.0  
**Status:** VALIDATED  
**Date:** Jan 2026

---

## 1. Overview
This document details the VinFast Connected Car API interactions, specifically validated against **VF9 Firmware v2.1.5**. 

> **Note**: For specific Telemetry Data Mappings (Battery, Tires, Climate), please refer to the **[Data Dictionary](./04_Data_Dictionary.md)**.

### Regional Configuration
| Region | API Base URL | Auth0 Domain | Client ID |
| :--- | :--- | :--- | :--- |
| **Vietnam (VN)** | `https://mobile.connected-car.vinfast.vn` | `vin3s.au.auth0.com` | `jE5xt50qC7oIh1f32qMzA6hGznIU5mgH` |
| **United States** | `https://mobile.connected-car.vinfastauto.us` | `vinfast-us-prod.us.auth0.com` | `xhGY7XKDFSk1Q22rxidvwujfz0EPAbUP` |
| **Europe (EU)** | `https://mobile.connected-car.vinfastauto.eu` | `vinfast-eu-prod.eu.auth0.com` | `dxxtNkkhsPWW78x6s1BWQlmuCfLQrkze` |

---

## 2. Authentication Flow
The API uses Auth0 standards.

**Endpoint**: `https://{auth0_domain}/oauth/token`  
**Method**: `POST`  
**Required Headers**: `Content-Type: application/json`
**Payload**:
```json
{
  "client_id": "{client_id}",
  "audience": "https://{auth0_domain}/api/v2/",
  "grant_type": "password",
  "username": "...",
  "password": "..."
}
```

**Response (200 OK)**:
*(Reference: `docs/api/responses/token.json`)*
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "v1.MR2AY0QvbrAeFQ5...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email ... offline_access",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```
> **Note**: The backend **MUST** securely store the `refresh_token` (e.g., in a session file or database) to enable auto-renewal of access tokens when they expire (`401 Unauthorized`).

### 2.1 Refresh Token
**Endpoint**: `https://{auth0_domain}/oauth/token`  
**Method**: `POST`  
**Payload**:
```json
{
  "client_id": "{client_id}",
  "grant_type": "refresh_token",
  "refresh_token": "{refresh_token}"
}
```

---

## 3. Common Request Headers
All API calls (except Login) require these standard headers:
```http
Authorization: Bearer {access_token}
Content-Type: application/json
x-service-name: CAPP
x-app-version: 1.10.3
x-device-platform: HomeAssistant
x-device-family: Integration
x-device-os-version: 1.0
x-device-identifier: ha-vinfast-integration
```

---

## 4. Core API Endpoints

### 4.1 Get Vehicles
**Endpoint**: `/ccarusermgnt/api/v1/user-vehicle` (GET)
*   **Purpose**: Retrieve `vinCode`, `vehicleAliasVersion`, User Profile, and Avatar.
*   **Response**: List of vehicles associated with the authorized user.

### 4.2 Get Telemetry (Deep Scan)
**Endpoint**: `/ccaraccessmgmt/api/v1/telemetry/app/ping` (POST)
*   **Purpose**: Request real-time status for specific sensor IDs.
*   **Payload**: List of `objectId`, `instanceId`, and `resourceId` to fetch.

---

## 5. Control Limitations
> **IMPORTANT**: Remote Control Commands (Lock/Unlock) are **NOT Supported**.

Control commands require cryptographic keys tied to the specific paired mobile device (Phone). This dashboard integration uses the user's account credentials but does not have access to the private keys stored in the official VinFast app's secure keystore, making command signing impossible.
