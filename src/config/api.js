/**
 * API Configuration
 * Centralized endpoints and base URL
 */

// Use relative path by default. This allows the app to work on localhost:4321,
// Cloudflare Pages, or Vercel automatically without configuring PUBLIC_API_URL.
let API_BASE_URL = import.meta.env.PUBLIC_API_URL || "";

// Only add protocol if a full domain is provided (and not empty)
if (API_BASE_URL && !API_BASE_URL.startsWith("http")) {
  API_BASE_URL = `https://${API_BASE_URL}`;
}

export const ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/login`,
  USER: `${API_BASE_URL}/api/user`,
  VEHICLES: `${API_BASE_URL}/api/vehicles`,
  TELEMETRY: (vin) => `${API_BASE_URL}/api/telemetry/${vin}`,
  LOGOUT: `${API_BASE_URL}/api/logout`,
};

export default {
  BASE_URL: API_BASE_URL,
  ENDPOINTS,
};
