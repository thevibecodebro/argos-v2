import { describe, expect, it } from "vitest";
import {
  buildGhlOAuthUrl,
  buildZoomOAuthUrl,
  decodeIntegrationOAuthState,
  encodeIntegrationOAuthState,
  resolveGhlRedirectUri,
  resolveZoomRedirectUri,
} from "./oauth";

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

  it("builds provider authorization urls with the archived scopes", () => {
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
    expect(zoomUrl.searchParams.get("scope")).toBe("recording:read webhook:write");

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
});
