import crypto from "node:crypto";

type EnvSource = Partial<Record<string, string | undefined>>;

export type IntegrationOAuthProvider = "zoom" | "ghl";

export type IntegrationOAuthState = {
  orgId: string;
  userId: string;
  nonce: string;
};

export const integrationOAuthCookieNames: Record<IntegrationOAuthProvider, string> = {
  zoom: "argos_zoom_oauth_nonce",
  ghl: "argos_ghl_oauth_nonce",
};

export function buildZoomOAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const authUrl = new URL("https://zoom.us/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", input.clientId);
  authUrl.searchParams.set("redirect_uri", input.redirectUri);
  authUrl.searchParams.set("state", input.state);
  authUrl.searchParams.set("scope", "recording:read webhook:write");
  return authUrl.toString();
}

export function buildGhlOAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const authUrl = new URL("https://marketplace.gohighlevel.com/oauth/chooselocation");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", input.clientId);
  authUrl.searchParams.set("redirect_uri", input.redirectUri);
  authUrl.searchParams.set("scope", "contacts.readonly contacts.write locations.readonly");
  authUrl.searchParams.set("state", input.state);
  return authUrl.toString();
}

export function encodeIntegrationOAuthState(payload: IntegrationOAuthState) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeIntegrationOAuthState(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<IntegrationOAuthState>;

    if (!parsed.orgId || !parsed.userId || !parsed.nonce) {
      return null;
    }

    return {
      orgId: parsed.orgId,
      userId: parsed.userId,
      nonce: parsed.nonce,
    };
  } catch {
    return null;
  }
}

export function createIntegrationNonce() {
  return crypto.randomBytes(24).toString("hex");
}

export function timingSafeNonceMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function resolveZoomRedirectUri(origin: string, env: EnvSource = process.env) {
  return env.ZOOM_REDIRECT_URI ?? `${origin}/api/integrations/zoom/callback`;
}

export function resolveZoomWebhookUrl(origin: string, env: EnvSource = process.env) {
  return env.ARGOS_WEBHOOK_URL ?? `${origin}/api/webhooks/zoom`;
}

export function resolveGhlRedirectUri(origin: string, env: EnvSource = process.env) {
  return env.GHL_REDIRECT_URI ?? `${origin}/api/integrations/ghl/callback`;
}

export function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return url.origin;
}

export async function exchangeZoomCode(
  code: string,
  redirectUri: string,
  env: EnvSource = process.env,
) {
  const clientId = env.ZOOM_CLIENT_ID;
  const clientSecret = env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Zoom integration is not configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenUrl = new URL("https://zoom.us/oauth/token");
  tokenUrl.searchParams.set("grant_type", "authorization_code");
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!tokenResponse.ok) {
    throw new Error(`Zoom token exchange failed: ${tokenResponse.status}`);
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const meResponse = await fetch("https://api.zoom.us/v2/users/me", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  const mePayload = meResponse.ok
    ? ((await meResponse.json()) as { id?: string; account_id?: string })
    : {};

  return {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokenPayload.expires_in * 1000 - 60_000),
    zoomAccountId: mePayload.account_id ?? null,
    zoomUserId: mePayload.id ?? null,
  };
}

export async function exchangeGhlCode(
  code: string,
  redirectUri: string,
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
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    user_type: "Location",
  });

  const tokenResponse = await fetch("https://services.leadconnectorhq.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!tokenResponse.ok) {
    throw new Error(`GHL token exchange failed: ${tokenResponse.status}`);
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    locationId?: string;
  };

  let locationName: string | null = null;

  if (tokenPayload.locationId) {
    const locationResponse = await fetch(
      `https://services.leadconnectorhq.com/locations/${tokenPayload.locationId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          Version: "2021-07-28",
        },
      },
    ).catch(() => null);

    if (locationResponse?.ok) {
      const locationPayload = (await locationResponse.json()) as {
        location?: { name?: string };
      };
      locationName = locationPayload.location?.name ?? null;
    }
  }

  return {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokenPayload.expires_in * 1000 - 60_000),
    locationId: tokenPayload.locationId ?? "",
    locationName,
  };
}

export async function registerZoomWebhook(input: {
  accessToken: string;
  webhookToken: string;
  webhookUrl: string;
  zoomAccountId?: string | null;
}) {
  const response = await fetch("https://api.zoom.us/v2/webhooks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      events: ["recording.completed"],
      secret_token: input.webhookToken,
      url: input.webhookUrl,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Zoom webhook registration failed: ${response.status}${errorBody ? ` ${errorBody}` : ""}`);
  }

  const payload = (await response.json().catch(() => ({}))) as { webhook_id?: string };
  return payload.webhook_id ?? "";
}
