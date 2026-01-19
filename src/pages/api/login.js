export const prerender = false;

import { REGIONS } from "../../config/vinfast";

export const GET = async () => {
  return new Response(
    JSON.stringify({
      message: "Login API is active. Use POST to authenticate.",
      debug: {
        token: "TOKEN_V2_5566_BINGO",
        timestamp: "2026-01-18 17:42:00",
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};

export const POST = async ({ request }) => {
  try {
    const { email, password, region } = await request.json();
    const regionConfig = REGIONS[region] || REGIONS["vn"];

    const url = `https://${regionConfig.auth0_domain}/oauth/token`;
    const payload = {
      client_id: regionConfig.auth0_client_id,
      audience: regionConfig.auth0_audience,
      grant_type: "password",
      scope: "offline_access openid profile email",
      username: email,
      password: password,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
