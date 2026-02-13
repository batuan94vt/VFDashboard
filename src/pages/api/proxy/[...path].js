export const prerender = false;

import { REGIONS, DEFAULT_REGION, API_HEADERS } from "../../../config/vinfast";
import crypto from "crypto";

// Restrict proxy usage to known VinFast API namespaces used by the dashboard.
const ALLOWED_PATH_PREFIXES = [
  "ccarusermgnt/api/v1/user-vehicle",
  "modelmgmt/api/v2/vehicle-model/",
  "ccaraccessmgmt/api/v1/telemetry/",
];

/**
 * Generate X-HASH for VinFast API request
 * Algorithm: HMAC-SHA256(secretKey, message) -> Base64
 * Message format: method_path_vin_secretKey_timestamp (lowercase)
 */
function generateXHash(method, apiPath, vin, timestamp, secretKey) {
  // Remove query string from path
  const pathWithoutQuery = apiPath.split("?")[0];

  // Ensure path starts with /
  const normalizedPath = pathWithoutQuery.startsWith("/")
    ? pathWithoutQuery
    : "/" + pathWithoutQuery;

  // Build message parts
  const parts = [method, normalizedPath];
  if (vin) {
    parts.push(vin);
  }
  parts.push(secretKey);
  parts.push(String(timestamp));

  // Join with underscore and lowercase
  const message = parts.join("_").toLowerCase();

  // HMAC-SHA256
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);

  // Base64 encode
  return hmac.digest("base64");
}

export const ALL = async ({ request, params, cookies, locals }) => {
  const apiPath = params.path;

  const isAllowedPath = ALLOWED_PATH_PREFIXES.some((prefix) =>
    apiPath.startsWith(prefix),
  );
  if (!isAllowedPath) {
    return new Response(JSON.stringify({ error: "Proxy path not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const urlObj = new URL(request.url);
  const region = urlObj.searchParams.get("region") || DEFAULT_REGION;
  const regionConfig = REGIONS[region] || REGIONS[DEFAULT_REGION];

  // Strip internal params from query
  const targetSearchParams = new URLSearchParams(urlObj.search);
  targetSearchParams.delete("region");

  const searchStr = targetSearchParams.toString();
  const targetUrl = `${regionConfig.api_base}/${apiPath}${searchStr ? "?" + searchStr : ""}`;

  const accessToken = cookies.get("access_token")?.value;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const clientHeaders = request.headers;
  const vinHeader = clientHeaders.get("x-vin-code");
  const playerHeader = clientHeaders.get("x-player-identifier");

  // Get request body for POST/PUT/PATCH
  let requestBody = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    requestBody = await request.text();
  }

  const runtimeEnv = locals?.runtime?.env || import.meta.env || {};
  let secretKey =
    runtimeEnv.VINFAST_XHASH_SECRET ||
    (typeof process !== "undefined"
      ? process.env.VINFAST_XHASH_SECRET
      : undefined);

  if (!secretKey && import.meta.env.DEV) {
    // Preserve local developer UX while still requiring env var in production.
    secretKey = "Vinfast@2025";
    console.warn("DEV fallback: using default VINFAST_XHASH_SECRET.");
  }

  if (!secretKey) {
    console.error(
      "CRITICAL: VINFAST_XHASH_SECRET environment variable is missing",
    );
    return new Response(
      JSON.stringify({ error: "Server Configuration Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const timestamp = Date.now();
  const xHash = generateXHash(
    request.method,
    apiPath,
    vinHeader,
    timestamp,
    secretKey,
  );
  const xTimestamp = String(timestamp);
  console.log(`[Proxy] Generated X-HASH for ${request.method} /${apiPath}`);

  const proxyHeaders = {
    ...API_HEADERS, // standard headers
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "X-HASH": xHash,
    "X-TIMESTAMP": xTimestamp,
  };

  if (vinHeader) proxyHeaders["x-vin-code"] = vinHeader;
  if (playerHeader) proxyHeaders["x-player-identifier"] = playerHeader;

  const init = {
    method: request.method,
    headers: proxyHeaders,
  };

  if (requestBody) {
    init.body = requestBody;
  }

  try {
    const response = await fetch(targetUrl, init);
    const data = await response.text();

    // Add debug header to indicate if hash was used
    const responseHeaders = {
      "Content-Type": "application/json",
    };
    responseHeaders["X-Hash-Source"] = "generated";

    return new Response(data, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error(`[Proxy Error] ${request.method} /${apiPath}:`, e);
    return new Response(JSON.stringify({ error: "Internal Proxy Error" }), {
      status: 500,
    });
  }
};
