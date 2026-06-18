type EnvSource = Partial<Record<"GHL_CLIENT_ID" | "GHL_CLIENT_SECRET", string | undefined>>;

const GHL_OAUTH_FETCH_TIMEOUT_MS = 30_000;

export async function refreshGhlToken(
  refreshToken: string,
  env: EnvSource = process.env,
) {
  const clientId = env.GHL_CLIENT_ID;
  const clientSecret = env.GHL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GHL integration is not configured");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    user_type: "Location",
  });

  const response = await fetchWithTimeout(
    "https://services.leadconnectorhq.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    GHL_OAUTH_FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`GHL token refresh failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenExpiresAt: new Date(Date.now() + payload.expires_in * 1000 - 60_000),
  };
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
