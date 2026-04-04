import { describe, expect, it, vi } from "vitest";
import {
  disconnectIntegration,
  getIntegrationStatuses,
  type IntegrationsRepository,
} from "./service";

function createRepository(
  overrides: Partial<IntegrationsRepository> = {},
): IntegrationsRepository {
  return {
    deleteGhlIntegration: vi.fn(),
    deleteZoomIntegration: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findGhlStatus: vi.fn(),
    findZoomStatus: vi.fn(),
    ...overrides,
  };
}

describe("getIntegrationStatuses", () => {
  it("exposes connection metadata, action paths, and provider availability for managers", async () => {
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
      }),
    });

    const result = await getIntegrationStatuses(repository, "manager-1", {
      ghlClientId: null,
      zoomClientId: "zoom-client-id",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected integration statuses");
    expect(result.data.canManage).toBe(true);
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
});

describe("disconnectIntegration", () => {
  it("rejects disconnect attempts from reps", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
    });

    const result = await disconnectIntegration(repository, "rep-1", "zoom");

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Only managers and admins can manage integrations",
    });
  });

  it("deletes the provider row for managers", async () => {
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
    expect(repository.deleteZoomIntegration).toHaveBeenCalledWith("org-1");
  });
});
