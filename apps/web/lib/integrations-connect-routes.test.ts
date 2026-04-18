import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createIntegrationsRepository = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository,
}));

describe("integration connect routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createIntegrationsRepository.mockReset();
  });

  it("rejects manager-initiated Zoom OAuth connects", async () => {
    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        org: { id: "org-1", slug: "argos" },
      }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const route = await import("../app/api/integrations/zoom/connect/route");
    const response = await route.GET(new Request("https://app.argos.ai/api/integrations/zoom/connect"));

    expect(response.headers.get("location")).toBe("https://app.argos.ai/settings/integrations?zoom_error=forbidden");
  });

  it("rejects executive-initiated GHL OAuth connects", async () => {
    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "executive-1",
        role: "executive",
        org: { id: "org-1", slug: "argos" },
      }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const route = await import("../app/api/integrations/ghl/connect/route");
    const response = await route.GET(new Request("https://app.argos.ai/api/integrations/ghl/connect"));

    expect(response.headers.get("location")).toBe("https://app.argos.ai/settings/integrations?ghl_error=forbidden");
  });
});
