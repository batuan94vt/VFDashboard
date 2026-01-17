# VinFast Dashboard - Backend

This is the **Backend for Frontend (BFF)** service for the VinFast Dashboard. It acts as a secure proxy between the client and the official VinFast API, handling authentication, token management, and data transformation.

## 🛠 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v23+)
- **Framework**: [Fastify](https://www.fastify.io/) (High-performance web framework)
- **Features**:
  - `@fastify/cookie`: Secure HTTP-only cookie management.
  - `@fastify/cors`: CORS configuration for development/production.
  - **BFF Pattern**: Offloads complex auth logic from the browser.

## 🔑 Key Features

1.  **Auth Proxy**: Logs in to VinFast (Auth0) and returns a session cookie (`access_token`) to the frontend.
2.  **Token Refresh**: Automatically refreshes expired tokens using the stored `refresh_token` without user intervention.
3.  **Reverse Geocoding**: Converts GPS coordinates to proper address names (City, Country).
4.  **Weather Integration**: Fetches real-time weather data based on vehicle location.

## 🚀 Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start Server**:
    ```bash
    node server.js
    ```
    Server runs on `http://localhost:3000`

## ⚙️ Configuration

Create a `.env` file (optional):

```env
PORT=3000
COOKIE_SECRET=super-secret-key-change-this-in-prod
```
