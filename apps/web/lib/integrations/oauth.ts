import crypto from "node:crypto";
import { fetchWithTimeout } from "@/lib/security/fetch-timeout";
import { getSafeRequestOrigin } from "../security/trusted-origins";

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

const ZOOM_OAUTH_FETCH_TIMEOUT_MS = 30_000;
const ZOOM_API_FETCH_TIMEOUT_MS = 30_000;
const GHL_OAUTH_FETCH_TIMEOUT_MS = 30_000;
const GHL_API_FETCH_TIMEOUT_MS = 30_000;

export const GHL_OAUTH_SCOPES = [
  "locations.readonly",
  "conversations.readonly",
  "conversations/message.readonly",
  "users.readonly",
  "contacts.readonly",
] as const;

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
  return authUrl.toString();
}

export function buildGhlOAuthUrl(input: {
  clientId: string;
  installUrl?: string | null;
  redirectUri: string;
  state: string;
}) {
  const authUrl = input.installUrl?.trim()
    ? new URL(input.installUrl)
    : new URL("https://marketplace.gohighlevel.com/oauth/chooselocation");

  if (authUrl.protocol !== "https:") {
    throw new Error("GHL install URL must use HTTPS");
  }

  if (!authUrl.searchParams.has("response_type")) {
    authUrl.searchParams.set("response_type", "code");
  }
  if (!authUrl.searchParams.has("client_id")) {
    authUrl.searchParams.set("client_id", input.clientId);
  }
  if (!authUrl.searchParams.has("redirect_uri")) {
    authUrl.searchParams.set("redirect_uri", input.redirectUri);
  }
  if (!authUrl.searchParams.has("scope")) {
    authUrl.searchParams.set("scope", GHL_OAUTH_SCOPES.join(" "));
  }
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
  return env.GHL_REDIRECT_URI ?? `${origin}/api/integrations/leadconnector/callback`;
}

export function getRequestOrigin(request: Request) {
  return getSafeRequestOrigin(request);
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

  const { response: tokenResponse, body: tokenBody } = await fetchWithTimeout<
    | {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }
    | null
  >(
    tokenUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
    ZOOM_OAUTH_FETCH_TIMEOUT_MS,
    (response) =>
      response.ok
        ? (response.json() as Promise<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
          }>)
        : Promise.resolve(null),
  );

  if (!tokenResponse.ok) {
    throw new Error(`Zoom token exchange failed: ${tokenResponse.status}`);
  }

  const tokenPayload = tokenBody as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const { response: meResponse, body: mePayload } = await fetchWithTimeout<{
    id?: string;
    account_id?: string;
  }>(
    "https://api.zoom.us/v2/users/me",
    {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    },
    ZOOM_API_FETCH_TIMEOUT_MS,
    (response) =>
      response.ok
        ? (response.json() as Promise<{ id?: string; account_id?: string }>)
        : Promise.resolve({}),
  );

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

  const { response: tokenResponse, body: tokenBody } = await fetchWithTimeout<
    | {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        locationId?: string;
      }
    | null
  >(
    "https://services.leadconnectorhq.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    GHL_OAUTH_FETCH_TIMEOUT_MS,
    (response) =>
      response.ok
        ? (response.json() as Promise<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
            locationId?: string;
          }>)
        : Promise.resolve(null),
  );

  if (!tokenResponse.ok) {
    throw new Error(`GHL token exchange failed: ${tokenResponse.status}`);
  }

  const tokenPayload = tokenBody as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    locationId?: string;
  };

  let locationName: string | null = null;

  if (tokenPayload.locationId) {
    const { response: locationResponse, body: locationPayload } = await fetchWithTimeout<{
      location?: { name?: string };
    }>(
      `https://services.leadconnectorhq.com/locations/${tokenPayload.locationId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          Version: "2021-07-28",
        },
      },
      GHL_API_FETCH_TIMEOUT_MS,
      (response) =>
        response.ok
          ? (response.json() as Promise<{ location?: { name?: string } }>)
          : Promise.resolve({}),
    ).catch(() => ({ response: null, body: {} }));

    if (locationResponse?.ok) {
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

  const { response: tokenResponse, body: tokenBody } = await fetchWithTimeout<
    | {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }
    | null
  >(
    "https://services.leadconnectorhq.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    GHL_OAUTH_FETCH_TIMEOUT_MS,
    (response) =>
      response.ok
        ? (response.json() as Promise<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
          }>)
        : Promise.resolve(null),
  );

  if (!tokenResponse.ok) {
    throw new Error(`GHL token refresh failed: ${tokenResponse.status}`);
  }

  const tokenPayload = tokenBody as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokenPayload.expires_in * 1000 - 60_000),
  };
}

export async function refreshZoomToken(
  refreshToken: string,
  env: EnvSource = process.env,
) {
  const clientId = env.ZOOM_CLIENT_ID;
  const clientSecret = env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Zoom integration is not configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenUrl = new URL("https://zoom.us/oauth/token");
  tokenUrl.searchParams.set("grant_type", "refresh_token");
  tokenUrl.searchParams.set("refresh_token", refreshToken);

  const { response: tokenResponse, body: tokenBody } = await fetchWithTimeout<
    | {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }
    | null
  >(
    tokenUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
    ZOOM_OAUTH_FETCH_TIMEOUT_MS,
    (response) =>
      response.ok
        ? (response.json() as Promise<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
          }>)
        : Promise.resolve(null),
  );

  if (!tokenResponse.ok) {
    throw new Error(`Zoom token refresh failed: ${tokenResponse.status}`);
  }

  const tokenPayload = tokenBody as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokenPayload.expires_in * 1000 - 60_000),
  };
}

export async function deleteZoomWebhook(input: {
  accessToken: string;
  webhookId: string;
}) {
  await fetchWithTimeout(
    `https://api.zoom.us/v2/webhooks/${input.webhookId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
    ZOOM_API_FETCH_TIMEOUT_MS,
    (response) => response.text().catch(() => ""),
  );
}

export async function registerZoomWebhook(input: {
  accessToken: string;
  webhookToken: string;
  webhookUrl: string;
  zoomAccountId?: string | null;
}) {
  const { response, body } = await fetchWithTimeout<string | { webhook_id?: string }>(
    "https://api.zoom.us/v2/webhooks",
    {
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
    },
    ZOOM_API_FETCH_TIMEOUT_MS,
    (response) =>
      response.ok
        ? (response.json().catch(() => ({})) as Promise<{ webhook_id?: string }>)
        : response.text().catch(() => ""),
  );

  if (!response.ok) {
    const errorBody = typeof body === "string" ? body : "";
    throw new Error(`Zoom webhook registration failed: ${response.status}${errorBody ? ` ${errorBody}` : ""}`);
  }

  const payload = body as { webhook_id?: string };
  return payload.webhook_id ?? "";
}
