import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  IntegrationsPanel,
  disconnectIntegrationFromBrowser,
  getDisconnectConfirmationCopy,
  getDisconnectErrorMessage,
} from "../components/settings/integrations-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const connectedProps = {
  zoom: {
    available: true,
    connectPath: "/api/integrations/zoom/connect",
    connected: true,
    connectedAt: "2026-04-30T12:00:00.000Z",
    disconnectPath: "/api/integrations/zoom/disconnect",
    zoomUserId: "zoom-user-1",
  },
  ghl: {
    available: true,
    connectPath: "/api/integrations/ghl/connect",
    connected: true,
    connectedAt: "2026-04-30T12:00:00.000Z",
    disconnectPath: "/api/integrations/ghl/disconnect",
    locationId: "loc-1",
    locationName: "North Team",
    syncEnabled: true,
    consentConfirmedAt: "2026-04-30T12:05:00.000Z",
    defaultRepId: "rep-1",
    mappedUsersCount: 2,
    lastSyncStartedAt: "2026-04-30T12:10:00.000Z",
    lastSyncCompletedAt: "2026-04-30T12:11:00.000Z",
    lastSyncError: null,
  },
};

describe("IntegrationsPanel disconnect feedback", () => {
  it("uses service-specific disconnect confirmation copy", () => {
    expect(getDisconnectConfirmationCopy("zoom")).toBe("Disconnect Zoom from this workspace?");
    expect(getDisconnectConfirmationCopy("ghl")).toBe("Disconnect Go High Level from this workspace?");
  });

  it("resolves JSON disconnect errors with clear service fallbacks", async () => {
    await expect(
      getDisconnectErrorMessage(
        "zoom",
        new Response(JSON.stringify({ message: "Zoom token is already revoked." }), { status: 500 }),
      ),
    ).resolves.toBe("Zoom token is already revoked.");

    await expect(
      getDisconnectErrorMessage("zoom", new Response("not json", { status: 500 })),
    ).resolves.toBe("Unable to disconnect Zoom. Try again.");

    await expect(
      getDisconnectErrorMessage("zoom", new Response(JSON.stringify({ error: "not_configured" }), { status: 500 })),
    ).resolves.toBe("Unable to disconnect Zoom. Try again.");

    await expect(
      getDisconnectErrorMessage("ghl", new Response(JSON.stringify({ error: "Provider refused disconnect." }), { status: 500 })),
    ).resolves.toBe("Provider refused disconnect.");

    await expect(
      getDisconnectErrorMessage("ghl", new Response("", { status: 500 })),
    ).resolves.toBe("Unable to disconnect Go High Level. Try again.");
  });

  it("maps disconnect transport failures to service-specific fallback errors", async () => {
    const zoomFetch = vi.fn().mockRejectedValue(new TypeError("network down"));
    const ghlFetch = vi.fn().mockRejectedValue(new TypeError("network down"));

    await expect(
      disconnectIntegrationFromBrowser("zoom", "/api/integrations/zoom/disconnect", zoomFetch),
    ).resolves.toEqual({
      ok: false,
      error: "Unable to disconnect Zoom. Try again.",
    });
    expect(zoomFetch).toHaveBeenCalledWith("/api/integrations/zoom/disconnect", { method: "POST" });

    await expect(
      disconnectIntegrationFromBrowser("ghl", "/api/integrations/ghl/disconnect", ghlFetch),
    ).resolves.toEqual({
      ok: false,
      error: "Unable to disconnect Go High Level. Try again.",
    });
    expect(ghlFetch).toHaveBeenCalledWith("/api/integrations/ghl/disconnect", { method: "POST" });
  });

  it("keeps connected integration cards on the settings surface", () => {
    const html = renderToStaticMarkup(createElement(IntegrationsPanel, connectedProps));

    expect(html).toContain("Zoom");
    expect(html).toContain("Go High Level");
    expect(html).toContain("Disconnect");
    expect(html).not.toContain("Are you sure?");
  });

  it("renders GHL recording sync metadata when connected", () => {
    const html = renderToStaticMarkup(createElement(IntegrationsPanel, connectedProps));

    expect(html).toContain("Call Recording Sync");
    expect(html).toContain("Consent confirmed");
    expect(html).toContain("Mapped users");
    expect(html).toContain("2");
    expect(html).toContain("Last sync");
  });
});
