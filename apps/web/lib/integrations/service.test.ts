import { describe, expect, it, vi } from "vitest";
import {
  disconnectIntegration,
  getIntegrationStatuses,
  updateGhlUserMappings,
  type IntegrationsRepository,
} from "./service";

function createRepository(
  overrides: Partial<IntegrationsRepository> = {},
): IntegrationsRepository {
  return {
    acknowledgeGhlRecordingConsent: vi.fn(),
    deleteGhlIntegration: vi.fn(),
    deleteZoomIntegration: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findGhlStatus: vi.fn(),
    findOrgUserIds: vi.fn(),
    findZoomIntegrationForDisconnect: vi.fn().mockResolvedValue(null),
    findZoomStatus: vi.fn(),
    listGhlUserMappings: vi.fn(),
    requestGhlSync: vi.fn(),
    setGhlDefaultRep: vi.fn(),
    updateZoomTokens: vi.fn(),
    upsertGhlUserMappings: vi.fn(),
    upsertZoomIntegration: vi.fn(),
    ...overrides,
  };
}

describe("getIntegrationStatuses", () => {
  it("exposes connection metadata but keeps org-level integration controls admin-only", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findZoomStatus: vi.fn().mockResolvedValue({
        connected: true,
        connectedAt: new Date("2026-04-03T00:00:00.000Z"),
        zoomUserId: "zoom-user-7",
      }),
      findGhlStatus: vi.fn().mockResolvedValue({
        connected: false,
        connectedAt: null,
        locationId: null,
        locationName: null,
        syncEnabled: false,
        consentConfirmedAt: null,
        defaultRepId: null,
        mappedUsersCount: 0,
        lastSyncStartedAt: null,
        lastSyncCompletedAt: null,
        lastSyncError: null,
      }),
    });

    const result = await getIntegrationStatuses(repository, "manager-1", {
      ghlClientSecret: "ghl-secret",
      ghlEnabled: "false",
      ghlClientId: null,
      zoomClientId: "zoom-client-id",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected integration statuses");
    expect(result.data.canManage).toBe(false);
    expect(repository.findZoomStatus).toHaveBeenCalledWith("org-1", "manager-1");
    expect(result.data.zoom).toMatchObject({
      available: true,
      connectPath: "/api/integrations/zoom/connect",
      connected: true,
      disconnectPath: "/api/integrations/zoom/disconnect",
      zoomUserId: "zoom-user-7",
    });
    expect(result.data.ghl).toMatchObject({
      available: false,
      connectPath: "/api/integrations/ghl/connect",
      connected: false,
      disconnectPath: "/api/integrations/ghl/disconnect",
    });
  });

  it("requires explicit GHL enablement and both GHL OAuth credentials before exposing it as available", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        email: "admin@argos.ai",
        role: "admin",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findZoomStatus: vi.fn().mockResolvedValue({
        connected: false,
        connectedAt: null,
        zoomUserId: null,
      }),
      findGhlStatus: vi.fn().mockResolvedValue({
        connected: false,
        connectedAt: null,
        locationId: null,
        locationName: null,
        syncEnabled: false,
        consentConfirmedAt: null,
        defaultRepId: null,
        mappedUsersCount: 0,
        lastSyncStartedAt: null,
        lastSyncCompletedAt: null,
        lastSyncError: null,
      }),
    });

    const disabled = await getIntegrationStatuses(repository, "admin-1", {
      ghlClientId: "ghl-client-id",
      ghlClientSecret: "ghl-secret",
      ghlEnabled: "false",
      zoomClientId: "zoom-client-id",
    });
    const missingSecret = await getIntegrationStatuses(repository, "admin-1", {
      ghlClientId: "ghl-client-id",
      ghlClientSecret: "",
      ghlEnabled: "true",
      zoomClientId: "zoom-client-id",
    });
    const enabled = await getIntegrationStatuses(repository, "admin-1", {
      ghlClientId: "ghl-client-id",
      ghlClientSecret: "ghl-secret",
      ghlEnabled: "true",
      zoomClientId: "zoom-client-id",
    });

    expect(disabled.ok && disabled.data.ghl.available).toBe(false);
    expect(missingSecret.ok && missingSecret.data.ghl.available).toBe(false);
    expect(enabled.ok && enabled.data.ghl.available).toBe(true);
  });

  it("does not report legacy GHL rows as connected when GHL is not enabled", async () => {
    const findGhlStatus = vi.fn().mockResolvedValue({
      connected: true,
      connectedAt: new Date("2026-04-03T00:00:00.000Z"),
      locationId: "location-1",
      locationName: "Legacy Location",
      syncEnabled: true,
      consentConfirmedAt: new Date("2026-04-03T00:00:00.000Z"),
      defaultRepId: "rep-1",
      mappedUsersCount: 3,
      lastSyncStartedAt: new Date("2026-04-03T00:15:00.000Z"),
      lastSyncCompletedAt: new Date("2026-04-03T00:16:00.000Z"),
      lastSyncError: null,
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        email: "admin@argos.ai",
        role: "admin",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findGhlStatus,
      findZoomStatus: vi.fn().mockResolvedValue({
        connected: false,
        connectedAt: null,
        zoomUserId: null,
      }),
    });

    const result = await getIntegrationStatuses(repository, "admin-1", {
      ghlClientId: "ghl-client-id",
      ghlClientSecret: "ghl-secret",
      ghlEnabled: "false",
      zoomClientId: "zoom-client-id",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected integration statuses");
    expect(result.data.ghl).toMatchObject({
      available: false,
      connected: false,
      connectedAt: null,
      locationId: null,
      locationName: null,
      syncEnabled: false,
      consentConfirmedAt: null,
      defaultRepId: null,
      mappedUsersCount: 0,
      lastSyncStartedAt: null,
      lastSyncCompletedAt: null,
      lastSyncError: null,
    });
    expect(findGhlStatus).not.toHaveBeenCalled();
  });

  it("exposes GHL consent, mapping, and sync metadata when connected", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        email: "admin@argos.ai",
        role: "admin",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findZoomStatus: vi.fn().mockResolvedValue({
        connected: false,
        connectedAt: null,
        zoomUserId: null,
      }),
      findGhlStatus: vi.fn().mockResolvedValue({
        connected: true,
        connectedAt: new Date("2026-06-18T12:00:00.000Z"),
        locationId: "loc-1",
        locationName: "North Team",
        syncEnabled: true,
        consentConfirmedAt: new Date("2026-06-18T12:05:00.000Z"),
        defaultRepId: "rep-1",
        mappedUsersCount: 2,
        lastSyncStartedAt: new Date("2026-06-18T12:10:00.000Z"),
        lastSyncCompletedAt: new Date("2026-06-18T12:11:00.000Z"),
        lastSyncError: null,
      }),
    });

    const result = await getIntegrationStatuses(repository, "admin-1", {
      ghlClientId: "ghl-client-id",
      ghlClientSecret: "ghl-secret",
      ghlEnabled: "true",
      zoomClientId: "zoom-client-id",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected integration statuses");
    expect(result.data.ghl).toMatchObject({
      connected: true,
      locationId: "loc-1",
      locationName: "North Team",
      syncEnabled: true,
      consentConfirmedAt: "2026-06-18T12:05:00.000Z",
      defaultRepId: "rep-1",
      mappedUsersCount: 2,
      lastSyncStartedAt: "2026-06-18T12:10:00.000Z",
      lastSyncCompletedAt: "2026-06-18T12:11:00.000Z",
      lastSyncError: null,
    });
  });
});

describe("disconnectIntegration", () => {
  it("allows non-admins to disconnect their own Zoom integration", async () => {
    const repository = createRepository({
      deleteZoomIntegration: vi.fn().mockResolvedValue(true),
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
    });

    const result = await disconnectIntegration(repository, "manager-1", "zoom");

    expect(result).toEqual({
      ok: true,
      data: { provider: "zoom", success: true },
    });
    expect(repository.deleteZoomIntegration).toHaveBeenCalledWith("org-1", "manager-1");
  });

  it("rejects non-admin GHL disconnect attempts", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
    });

    const result = await disconnectIntegration(repository, "manager-1", "ghl");

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Only organization admins can manage integrations",
    });
  });

  it("deletes the provider row for admins", async () => {
    const repository = createRepository({
      deleteZoomIntegration: vi.fn().mockResolvedValue(true),
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        email: "admin@argos.ai",
        role: "admin",
        firstName: "Jared",
        lastName: "Newman",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
    });

    const result = await disconnectIntegration(repository, "admin-1", "zoom");

    expect(result).toEqual({
      ok: true,
      data: { provider: "zoom", success: true },
    });
    expect(repository.deleteZoomIntegration).toHaveBeenCalledWith("org-1", "admin-1");
  });
});

describe("updateGhlUserMappings", () => {
  function createConnectedGhlRepository(overrides: Partial<IntegrationsRepository> = {}) {
    return createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        email: "admin@argos.ai",
        role: "admin",
        firstName: "Jared",
        lastName: "Newman",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findGhlStatus: vi.fn().mockResolvedValue({
        connected: true,
        connectedAt: new Date("2026-06-18T12:00:00.000Z"),
        locationId: "loc-1",
        locationName: "North Team",
        syncEnabled: true,
        consentConfirmedAt: null,
        defaultRepId: null,
        mappedUsersCount: 0,
        lastSyncStartedAt: null,
        lastSyncCompletedAt: null,
        lastSyncError: null,
      }),
      findOrgUserIds: vi.fn().mockResolvedValue(["rep-1", "rep-2"]),
      setGhlDefaultRep: vi.fn().mockResolvedValue(undefined),
      upsertGhlUserMappings: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    });
  }

  it("rejects default reps and mappings that reference users outside the viewer org", async () => {
    const repository = createConnectedGhlRepository({
      findOrgUserIds: vi.fn().mockResolvedValue(["rep-1"]),
    });

    const result = await updateGhlUserMappings(repository, "admin-1", {
      defaultRepId: "rep-1",
      mappings: [
        {
          argosUserId: "cross-tenant-user",
          ghlUserId: "ghl-user-1",
          ghlUserEmail: "rep@example.com",
          ghlUserName: "Rep One",
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "GHL mappings can only reference users in this organization",
    });
    expect(repository.findOrgUserIds).toHaveBeenCalledWith("org-1", [
      "rep-1",
      "cross-tenant-user",
    ]);
    expect(repository.setGhlDefaultRep).not.toHaveBeenCalled();
    expect(repository.upsertGhlUserMappings).not.toHaveBeenCalled();
  });

  it("persists GHL mappings when all selected Argos users belong to the viewer org", async () => {
    const repository = createConnectedGhlRepository();

    const result = await updateGhlUserMappings(repository, "admin-1", {
      defaultRepId: "rep-1",
      mappings: [
        {
          argosUserId: "rep-2",
          ghlUserId: "ghl-user-2",
          ghlUserEmail: "rep2@example.com",
          ghlUserName: "Rep Two",
        },
      ],
    });

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(repository.findOrgUserIds).toHaveBeenCalledWith("org-1", ["rep-1", "rep-2"]);
    expect(repository.setGhlDefaultRep).toHaveBeenCalledWith("org-1", "rep-1");
    expect(repository.upsertGhlUserMappings).toHaveBeenCalledWith({
      orgId: "org-1",
      locationId: "loc-1",
      mappings: [
        {
          argosUserId: "rep-2",
          ghlUserId: "ghl-user-2",
          ghlUserEmail: "rep2@example.com",
          ghlUserName: "Rep Two",
        },
      ],
    });
  });
});
