import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  IntegrationsPanel,
  disconnectIntegrationFromBrowser,
  getDisconnectConfirmationCopy,
  getDisconnectErrorMessage,
  getIngestionTitlePreviewStatus,
  getIngestionTitlePreviewLabel,
  ingestionTitleRulesReducer,
  prepareIngestionTitleFilterPhrase,
  saveIngestionTitleFiltersFromBrowser,
  updateGhlDefaultRepFromBrowser,
  updateGoogleMeetDefaultRepFromBrowser,
} from "../components/settings/integrations-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const connectedProps = {
  titleFilterEnforcementEnabled: true,
  titleFilters: {
    configured: true,
    excludePhrases: ["Internal"],
    includePhrases: ["Discovery Call"],
  },
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
    fallbackOwnerOptions: [
      {
        email: "riley@example.com",
        id: "rep-1",
        name: "Riley Stone",
        role: "rep",
      },
      {
        email: "morgan@example.com",
        id: "manager-1",
        name: "Morgan Lee",
        role: "manager",
      },
    ],
  },
  googleMeet: {
    available: true,
    connectPath: "/api/integrations/google-meet/connect",
    connected: true,
    connectedAt: "2026-04-30T12:00:00.000Z",
    consentConfirmedAt: "2026-04-30T12:05:00.000Z",
    defaultRepId: "rep-1",
    disconnectPath: "/api/integrations/google-meet/disconnect",
    fallbackOwnerOptions: [
      {
        email: "riley@example.com",
        id: "rep-1",
        name: "Riley Stone",
        role: "rep",
      },
    ],
    googleEmail: "organizer@example.com",
    lastSyncCompletedAt: "2026-04-30T12:11:00.000Z",
    lastSyncError: null,
    lastSyncStartedAt: "2026-04-30T12:10:00.000Z",
    syncEnabled: true,
  },
};

describe("IntegrationsPanel disconnect feedback", () => {
  it("uses service-specific disconnect confirmation copy", () => {
    expect(getDisconnectConfirmationCopy("zoom")).toBe("Disconnect Zoom from this workspace?");
    expect(getDisconnectConfirmationCopy("ghl")).toBe("Disconnect Go High Level from this workspace?");
    expect(getDisconnectConfirmationCopy("google_meet")).toBe(
      "Disconnect Google Meet from this workspace?",
    );
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
    expect(html).toContain("Google Meet");
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

  it("renders an organization-scoped fallback owner selector for connected GHL", () => {
    const html = renderToStaticMarkup(
      createElement(IntegrationsPanel, {
        ...connectedProps,
        ghl: {
          ...connectedProps.ghl,
          defaultRepId: null,
        },
      }),
    );

    expect(html).toContain('data-ghl-fallback-owner="true"');
    expect(html).toContain("Select fallback owner");
    expect(html).toContain("Riley Stone");
    expect(html).toContain("morgan@example.com");
    expect(html).toContain("Save owner");
  });

  it("saves the GHL fallback owner through the mappings endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));

    await expect(updateGhlDefaultRepFromBrowser("rep-1", fetcher)).resolves.toEqual({
      ok: true,
    });

    expect(fetcher).toHaveBeenCalledWith("/api/integrations/ghl/mappings", {
      body: JSON.stringify({ defaultRepId: "rep-1" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  });

  it("saves the Google Meet default owner through its settings endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));

    await expect(
      updateGoogleMeetDefaultRepFromBrowser("rep-1", fetcher),
    ).resolves.toEqual({ ok: true });

    expect(fetcher).toHaveBeenCalledWith("/api/integrations/google-meet/settings", {
      body: JSON.stringify({ defaultRepId: "rep-1" }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    });
  });

  it("renders Google Meet readiness, owner, consent, and post-meeting sync controls", () => {
    const html = renderToStaticMarkup(createElement(IntegrationsPanel, connectedProps));

    expect(html).toContain("Google Workspace recordings");
    expect(html).toContain("organizer@example.com");
    expect(html).toContain('data-google-meet-default-owner="true"');
    expect(html).toContain("Recording consent confirmed");
    expect(html).toContain("Sync now");
  });

  it("keeps Google Meet auto-ingestion paused until an include rule is saved", () => {
    const html = renderToStaticMarkup(
      createElement(IntegrationsPanel, {
        ...connectedProps,
        titleFilters: {
          configured: false,
          excludePhrases: [],
          includePhrases: [],
        },
        googleMeet: {
          ...connectedProps.googleMeet,
          consentConfirmedAt: null,
          defaultRepId: null,
          syncEnabled: false,
        },
      }),
    );

    expect(html).toContain("Google Meet auto-ingestion paused");
    expect(html).toContain("Save an include title rule and select a default owner before confirming consent.");
  });

  it("normalizes title-filter additions before sending them to the server", () => {
    expect(prepareIngestionTitleFilterPhrase("  Weekly\t\n Review  ")).toBe(
      "Weekly Review",
    );
  });

  it("saves title filters through the organization endpoint and returns the authoritative config", async () => {
    const config = {
      configured: true,
      excludePhrases: ["Internal"],
      includePhrases: ["Discovery Call"],
    };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(config), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await expect(
      saveIngestionTitleFiltersFromBrowser(config, fetcher),
    ).resolves.toEqual({ data: config, ok: true });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/organizations/ingestion-title-filters",
      {
        body: JSON.stringify({
          excludePhrases: ["Internal"],
          includePhrases: ["Discovery Call"],
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );
  });

  it("returns readable server and transport errors when title-filter saving fails", async () => {
    const config = {
      configured: false,
      excludePhrases: [],
      includePhrases: [],
    };
    const serverFailure = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Include phrases cannot overlap." }), {
        status: 400,
      }),
    );
    const transportFailure = vi.fn().mockRejectedValue(new TypeError("offline"));

    await expect(
      saveIngestionTitleFiltersFromBrowser(config, serverFailure),
    ).resolves.toEqual({ error: "Include phrases cannot overlap.", ok: false });
    await expect(
      saveIngestionTitleFiltersFromBrowser(config, transportFailure),
    ).resolves.toEqual({
      error: "Unable to save auto-ingestion title rules. Try again.",
      ok: false,
    });
  });

  it("preserves readable GHL payloads while filtering machine-like title-filter errors", async () => {
    const machineError = "organization_ingestion_title_filters_update_failed";
    const ghlFailure = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: machineError }), { status: 500 }),
    );
    const titleFilterFailure = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: machineError }), { status: 500 }),
    );

    await expect(
      updateGhlDefaultRepFromBrowser("rep-1", ghlFailure),
    ).resolves.toEqual({ error: machineError, ok: false });
    await expect(
      saveIngestionTitleFiltersFromBrowser(
        {
          configured: true,
          excludePhrases: [],
          includePhrases: ["Discovery Call"],
        },
        titleFilterFailure,
      ),
    ).resolves.toEqual({
      error: "Unable to save auto-ingestion title rules. Try again.",
      ok: false,
    });
  });

  it("renders the full-width title-rule editor before provider cards with preview copy", () => {
    const html = renderToStaticMarkup(createElement(IntegrationsPanel, connectedProps));

    expect(html).toContain('data-ingestion-title-rules="true"');
    expect(html.indexOf('data-ingestion-title-rules="true"')).toBeLessThan(
      html.indexOf("Call Recording Ingest"),
    );
    expect(html).toContain("Auto-ingestion title rules");
    expect(html).toContain("Include phrases");
    expect(html).toContain("Exclude phrases");
    expect(html).toContain("Test a title");
    expect(html).toContain("Missing title");
  });

  it("maps title preview decisions to operator-readable copy", () => {
    expect(getIngestionTitlePreviewStatus("Discovery call", connectedProps.titleFilters)).toEqual({
      accepted: true,
      label: "Included",
      reason: "included",
    });
    expect(getIngestionTitlePreviewStatus("Internal discovery", connectedProps.titleFilters)).toEqual({
      accepted: false,
      label: "Excluded",
      reason: "excluded",
    });
    expect(getIngestionTitlePreviewStatus("Team standup", connectedProps.titleFilters)).toEqual({
      accepted: false,
      label: "No include match",
      reason: "no_include_match",
    });
    expect(getIngestionTitlePreviewStatus("", connectedProps.titleFilters)).toEqual({
      accepted: false,
      label: "Missing title",
      reason: "missing_title",
    });
    expect(
      getIngestionTitlePreviewStatus("Discovery call", {
        configured: false,
        excludePhrases: [],
        includePhrases: [],
      }),
    ).toEqual({
      accepted: false,
      label: "Auto-ingestion paused",
      reason: "unconfigured",
    });
  });

  it("renders ready auto-import status on Zoom without changing its connection controls", () => {
    const html = renderToStaticMarkup(createElement(IntegrationsPanel, connectedProps));

    expect(html).toContain("Automatic recording import ready");
    expect(html).toContain("Auto-ingestion ready");
    expect(html).toContain("Disconnect");
  });

  it("renders paused auto-import status on Zoom while leaving OAuth connection available", () => {
    const html = renderToStaticMarkup(
      createElement(IntegrationsPanel, {
        ...connectedProps,
        titleFilters: {
          configured: false,
          excludePhrases: [],
          includePhrases: [],
        },
        zoom: {
          ...connectedProps.zoom,
          connected: false,
        },
      }),
    );

    expect(html).toContain("Automatic recording import paused");
    expect(html).toContain("Auto-ingestion paused");
    expect(html).toContain("Add at least one include phrase to enable auto-ingestion.");
    expect(html).toContain("Connect Zoom");
  });

  it("renders rollout-pending copy instead of paused or ready claims when enforcement is off", () => {
    const html = renderToStaticMarkup(
      createElement(IntegrationsPanel, {
        ...connectedProps,
        titleFilterEnforcementEnabled: false,
      }),
    );

    expect(html).toContain("Rollout pending");
    expect(html.match(/Title filtering not enabled/g)).toHaveLength(2);
    expect(html).not.toContain("Auto-ingestion ready");
    expect(html).not.toContain("Auto-ingestion paused");
    expect(html).not.toContain("Automatic recording import ready");
    expect(html).not.toContain("Automatic recording import paused");
  });

  it("keeps persisted readiness separate from unsaved add and remove drafts", () => {
    const pausedConfig = {
      configured: false,
      excludePhrases: [],
      includePhrases: [],
    };
    const readyConfig = connectedProps.titleFilters;

    const addedDraft = ingestionTitleRulesReducer(
      {
        dirty: false,
        draftConfig: pausedConfig,
        savedConfig: pausedConfig,
      },
      { kind: "include", phrase: "Discovery Call", type: "add" },
    );

    expect(addedDraft).toEqual({
      dirty: true,
      draftConfig: {
        configured: true,
        excludePhrases: [],
        includePhrases: ["Discovery Call"],
      },
      savedConfig: pausedConfig,
    });
    expect(getIngestionTitlePreviewLabel("Included", addedDraft.dirty)).toBe(
      "Included (unsaved preview)",
    );

    const removedDraft = ingestionTitleRulesReducer(
      {
        dirty: false,
        draftConfig: readyConfig,
        savedConfig: readyConfig,
      },
      { index: 0, kind: "include", type: "remove" },
    );

    expect(removedDraft.savedConfig.configured).toBe(true);
    expect(removedDraft.draftConfig.configured).toBe(false);
    expect(removedDraft.dirty).toBe(true);

    expect(
      ingestionTitleRulesReducer(addedDraft, {
        config: addedDraft.draftConfig,
        type: "saved",
      }),
    ).toEqual({
      dirty: false,
      draftConfig: addedDraft.draftConfig,
      savedConfig: addedDraft.draftConfig,
    });
  });
});
