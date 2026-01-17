# VinFast Dashboard - Business & Architecture Specification
**Version:** 1.0  
**Status:** DRAFT  
**Date:** Jan 2026

---

## 1. Business Context & Goals

### 1.1 Executive Summary
This project aims to build a modern, high-performance web dashboard for VinFast vehicle owners. Current native mobile apps can be slow or limited in providing deep technical insights. This dashboard acts as a "Digital Twin" monitor, offering real-time, detailed telemetry that empowers owners to understand their vehicle's health and status instantly.

### 1.2 Key Business Objectives
*   **BO-01 (Speed)**: Reduce the time-to-check critical status (Battery, Range, Charging) to **< 2 seconds**.
*   **BO-02 (Depth)**: Provide "Deep Scan" metrics (SOH, cell voltage, 12V status) that are hidden or hard to access in the native app.
*   **BO-03 (Accessibility)**: Enable access via any web browser (Desktop/Tablet) without requiring a mobile device.

---

## 2. Solution Architecture

### 2.1 Technology Stack
**Modernized stack targeting release horizon: Jan 2026.**

#### Frontend: Astro 5.0 + React
*   **Role**: High-performance UI Shell.
*   **Strategy**: "Islands Architecture" (Zero-JS static shell + Interactive React Islands).
*   **Key Libs**: TailwindCSS (Utility Styling), Nano Stores (State Management), Leaflet (Maps).

#### Backend Layer: Node.js (BFF)
*   **Role**: Backend for Frontend (BFF) & API Proxy.
*   **Framework**: Fastify or Hono (Lightweight, High Throughput).
*   **Responsibilities**:
    *   **Auth Proxy**: Handles VinFast Auth0 flows securely.
    *   **Token Vault**: Stores `access_token` encrypted (Server-side Only).
    *   **Cache Layer**: Caches telemetry (Redis/In-Memory) to prevent API rate-limiting.

#### External Integrations
*   **Open-Meteo**: Weather retrieval based on GPS coordinates.
*   **Nominatim (OSM)**: Reverse geocoding (Lat/Long -> City/Country).

### 2.2 System Diagram
```mermaid
graph TD
    User[User Browser]
    
    subgraph "Application Server (Node.js Environment)"
        Astro[Astro Server (SSR)]
        API[Node.js API Proxy / BFF]
        Cache[(in-memory Cache)]
    end
    
    subgraph "External Cloud Services"
        VF_Auth[VinFast Auth0]
        VF_API[VinFast Connected Car API]
        OpenMeteo[Open-Meteo API]
        Nominatim[Nominatim OSM]
    end

    User -- "HTTPS / HTML" --> Astro
    User -- "Client Islands (Fetch / WebSocket)" --> API
    
    Astro -- "Initial State" --> API
    API -- "Auth & Tokens" --> VF_Auth
    API -- "Telemetry Requests" --> VF_API
    API -- "Cache Data" --> Cache
    API -- "Weather" --> OpenMeteo
    API -- "Geocoding" --> Nominatim
```

---

## 3. Non-Functional Requirements (NFRs)

### 3.1 Performance
*   **NFR-PERF-01**: **Time to Interactive (TTI)** must be < 1.0 second on 4G networks.
*   **NFR-PERF-02**: Dashboard data freshness must be within 60 seconds (Cache TTL).

### 3.2 Security
*   **NFR-SEC-01**: VinFast Access Tokens must **NEVER** be exposed to the client-side browser.
*   **NFR-SEC-02**: All client-server communication must use HTTPS/WSS.
*   **NFR-SEC-03**: User sessions must use `HttpOnly; Secure; SameSite=Strict` cookies.

### 3.3 Reliability
*   **NFR-REL-01**: System must gracefully handle API failures (See *Fallback Strategy* in Functional Spec).
*   **NFR-REL-02**: 99.9% availability for cached data serving.

---

## 4. Development Roadmap
1.  **Phase 1**: Initialize Project (`npm create astro@latest`) & Setup Auth Proxy.
2.  **Phase 2**: Port API logic (`vinfast_api.py`) to TypeScript (`src/lib/vinfast.ts`).
3.  **Phase 3**: Build UI Components (Battery Card, Map Island).
4.  **Phase 4**: Security Hardening & Deployment.
