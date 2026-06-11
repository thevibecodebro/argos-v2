import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGhlOAuthUrl,
  buildZoomOAuthUrl,
  decodeIntegrationOAuthState,
  deleteZoomWebhook,
  encodeIntegrationOAuthState,
  exchangeGhlCode,
  exchangeZoomCode,
  refreshZoomToken,
  registerZoomWebhook,
  resolveGhlRedirectUri,
  resolveZoomRedirectUri,
} from "./oauth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("integration oauth helpers", () => {
  it("uses explicit redirect URI overrides when present", () => {
    expect(
      resolveZoomRedirectUri("http://localhost:3100", {
        ZOOM_REDIRECT_URI: "https://argos.ai/api/integrations/zoom/callback",
      }),
    ).toBe("https://argos.ai/api/integrations/zoom/callback");

    expect(
      resolveGhlRedirectUri("http://localhost:3100", {
        GHL_REDIRECT_URI: "https://argos.ai/api/integrations/ghl/callback",
      }),
    ).toBe("https://argos.ai/api/integrations/ghl/callback");
  });

  it("falls back to callback paths on the current origin", () => {
    expect(resolveZoomRedirectUri("http://localhost:3100", {})).toBe(
      "http://localhost:3100/api/integrations/zoom/callback",
    );
    expect(resolveGhlRedirectUri("https://app.argos.ai", {})).toBe(
      "https://app.argos.ai/api/integrations/ghl/callback",
    );
  });

  it("builds provider authorization urls without legacy Zoom scope overrides", () => {
    const zoomUrl = new URL(
      buildZoomOAuthUrl({
        clientId: "zoom-client",
        redirectUri: "http://localhost:3100/api/integrations/zoom/callback",
        state: "zoom-state",
      }),
    );
    expect(zoomUrl.origin + zoomUrl.pathname).toBe("https://zoom.us/oauth/authorize");
    expect(zoomUrl.searchParams.get("client_id")).toBe("zoom-client");
    expect(zoomUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3100/api/integrations/zoom/callback",
    );
    expect(zoomUrl.searchParams.get("scope")).toBeNull();

    const ghlUrl = new URL(
      buildGhlOAuthUrl({
        clientId: "ghl-client",
        redirectUri: "http://localhost:3100/api/integrations/ghl/callback",
        state: "ghl-state",
      }),
    );
    expect(ghlUrl.origin + ghlUrl.pathname).toBe(
      "https://marketplace.gohighlevel.com/oauth/chooselocation",
    );
    expect(ghlUrl.searchParams.get("client_id")).toBe("ghl-client");
    expect(ghlUrl.searchParams.get("scope")).toBe(
      "contacts.readonly contacts.write locations.readonly",
    );
  });

  it("round-trips encoded state and rejects malformed payloads", () => {
    const encoded = encodeIntegrationOAuthState({
      nonce: "nonce-123",
      orgId: "org-1",
      userId: "user-1",
    });

    expect(decodeIntegrationOAuthState(encoded)).toEqual({
      nonce: "nonce-123",
      orgId: "org-1",
      userId: "user-1",
    });

    expect(decodeIntegrationOAuthState("not-valid")).toBeNull();
    expect(
      decodeIntegrationOAuthState(
        Buffer.from(JSON.stringify({ orgId: "org-1", userId: "user-1" })).toString("base64url"),
      ),
    ).toBeNull();
  });

  it("uses timeout signals for Zoom token exchange and user lookup fetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "zoom-access",
            refresh_token: "zoom-refresh",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "zoom-user-1",
            account_id: "zoom-account-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await exchangeZoomCode("code-1", "https://app.argos.ai/api/integrations/zoom/callback", {
      ZOOM_CLIENT_ID: "zoom-client",
      ZOOM_CLIENT_SECRET: "zoom-secret",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.zoom.us/v2/users/me");
    expect(fetchMock.mock.calls[1]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses timeout signals for GHL token exchange and location lookup fetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "ghl-access",
            refresh_token: "ghl-refresh",
            expires_in: 3600,
            locationId: "loc-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            location: { name: "Acme Sales" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await exchangeGhlCode("code-1", "https://app.argos.ai/api/integrations/ghl/callback", {
      GHL_CLIENT_ID: "ghl-client",
      GHL_CLIENT_SECRET: "ghl-secret",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://services.leadconnectorhq.com/oauth/token");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://services.leadconnectorhq.com/locations/loc-1");
    expect(fetchMock.mock.calls[1]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses timeout signals for Zoom token refresh fetches", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "zoom-access-2",
          refresh_token: "zoom-refresh-2",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await refreshZoomToken("zoom-refresh", {
      ZOOM_CLIENT_ID: "zoom-client",
      ZOOM_CLIENT_SECRET: "zoom-secret",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses timeout signals for Zoom webhook deletion and registration fetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ webhook_id: "webhook-2" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await deleteZoomWebhook({
      accessToken: "zoom-access",
      webhookId: "webhook-1",
    });
    await registerZoomWebhook({
      accessToken: "zoom-access",
      webhookToken: "zoom-webhook-secret",
      webhookUrl: "https://app.argos.ai/api/webhooks/zoom",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.zoom.us/v2/webhooks/webhook-1");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.zoom.us/v2/webhooks");
    expect(fetchMock.mock.calls[1]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
