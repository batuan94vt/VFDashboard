# VinFast Dashboard - Functional Specification
**Version:** 1.0  
**Status:** DRAFT  
**Date:** Jan 2026

---

## 1. UI/UX Design Overview

### 1.1 Design Philosophy: "Clean Card-Based"
The design adopts a **Neumorphism / Soft UI** aesthetic with a modular "Bento Grid" layout. It emphasizes clarity, organization, and a premium feel appropriate for high-tech EV monitoring.

**Reference Visual Style**:
*(Refer to `assets/dashboard_preview.png` for visual style orientation)*

### 1.2 Core Layout Structure
*   **Theme**: Light/Clean (Soft shadows, Rounded Corners 24px).
*   **Grid System**: Modular cards that stack vertically on mobile and align specifically on Desktop.
*   **Information Portals**: Replacing generic controls with detailed, read-only status cards.

---

## 2. Functional Modules & Requirements

### Module A: Header & User Context
**Goal**: Identify the User and Vehicle immediately.
*   **FR-A-01**: Display "Welcome, [User Name]" and Avatar.
*   **FR-A-02**: Display Vehicle Model Label (e.g., "**Vinfast VF9 Plus - 2023 Model**").
*   **FR-A-03**: Display current local Weather (Icon + Temp).

### Module B: Central Car Status (The "Digital Twin")
**Visual**: Top-down view of the specific vehicle model.
*   **FR-B-01**: Show custom vehicle nickname (e.g., "**Deep Blue VF9**") below image.
*   **FR-B-02 (Tires)**: Display 4 callout bubbles for Tire Pressure (Bar) and Temperature (C).
*   **FR-B-03 (Doors)**: Display Open/Ajar status as a text warning inside the vehicle status area.

### Module C: Battery & Power
**Goal**: Mitigate Range Anxiety.
*   **FR-C-01**: Display High Voltage Battery % (Large Text).
*   **FR-C-02**: Display Estimated Range (Description: `364 km`).
*   **FR-C-03 (Charging)**: If charging, show **Target SOC** limit and **Time Remaining**.
*   **FR-C-04**: Display 12V Battery Health Status.
*   **FR-C-05**: Display Battery SOH (State of Health) %.

### Module D: Climate & Environment
*   **FR-D-01**: Display Interior and Exterior Temperatures.
*   **FR-D-02**: Display Fan/AC Status (if available).

### Module E: System Info Portal
**Goal**: Detailed Technical Monitoring.
*   **FR-E-01**: Display current FOTA Version (e.g., v2.1.5).
*   **FR-E-02**: List versions of key ECUs (BMS, Gateway).
*   **FR-E-03**: List active Vehicle Warnings (e.g., "Low Washer Fluid").

---

## 3. User Interactions & Micro-animations
*   **Interaction-01 (Alerts)**: Cards with Warnings (e.g., Low Tire Pressure) must highlight Red/Orange.
*   **Interaction-02 (Hover Effects)**: Cards should "lift" slightly (`transform: translateY(-5px)`) and glow when hovered.
*   **Interaction-03 (Data Updates)**: Values (Speed, %, Range) should "tick" up/down smoothly rather than instantly swapping.
*   **Interaction-04 (Loading States)**: Use **Skeleton Screens** with a shimmering wave effect during initial data fetch (do not use generic spinners).
*   **Interaction-05 (No Controls)**: The dashboard is Read-Only. No "Unlock" or "Start AC" buttons are present.

---

## 4. Technical Integration & Fallback Strategy

### 4.1 API Mapping (BFF)
*   **Login**: `POST /api/login`
*   **Get User/Avatar**: `GET /api/vehicles` (Returns list of vehicles with embedded user profile data)
*   **Get Telemetry**: `GET /api/telemetry/{vin}?deep_scan=true`

### 4.2 Fallback Data Strategy
If dynamic Alias Mapping (`api/responses/get-alias.json`) fails, the system **MUST** fallback to hardcoded resource IDs to ensure display continuity.

| Metric | Fallback Resource Path |
| :--- | :--- |
| **Battery Level** | `/34196/0/0` |
| **Range Estimate** | `/34196/0/1` |
| **Charging Status** | `/34197/0/0` |
| **Location (Lat/Long)**| `/34200/0/0` & `/34200/0/1` |
