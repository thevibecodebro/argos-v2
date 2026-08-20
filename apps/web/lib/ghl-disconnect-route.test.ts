import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedManagedCapability = vi.fn();
const createIntegrationsRepository = vi.fn();
const disconnectIntegration = vi.fn();

vi.mock("@/lib/access/managed-capabilities-server", () => ({
  requireAuthenticatedManagedCapability,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantRepository: vi.fn(async (repository) => repository),
}));

vi.mock("@/lib/integrations/service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/integrations/service")>(
    "@/lib/integrations/service",
  );

  return {
    ...actual,
    disconnectIntegration,
  };
});

describe("ghl disconnect route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    requireAuthenticatedManagedCapability.mockReset();
    createIntegrationsRepository.mockReset();
    disconnectIntegration.mockReset();
    requireAuthenticatedManagedCapability.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1" },
      orgId: "org-1",
      access: { mode: "legacy" },
    });
  });

  it("returns not_configured without disconnecting when GHL is not explicitly enabled", async () => {
    vi.stubEnv("ARGOS_GHL_ENABLED", "false");
    vi.stubEnv("GHL_CLIENT_ID", "ghl-client-id");
    vi.stubEnv("GHL_CLIENT_SECRET", "ghl-secret");

    const route = await import("../app/api/integrations/ghl/disconnect/route");
    const response = await route.POST();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "not_configured",
      error: "GoHighLevel integration is not configured",
    });
    expect(createIntegrationsRepository).not.toHaveBeenCalled();
    expect(disconnectIntegration).not.toHaveBeenCalled();
  });

  it("rejects disconnect before repository access when GHL is disabled for the workspace", async () => {
    requireAuthenticatedManagedCapability.mockResolvedValueOnce({
      ok: false,
      response: Response.json(
        { code: "feature_unavailable", error: "This feature is not enabled for this workspace" },
        { status: 403 },
      ),
    });

    const route = await import("../app/api/integrations/ghl/disconnect/route");
    const response = await route.POST();

    expect(response.status).toBe(403);
    expect(requireAuthenticatedManagedCapability).toHaveBeenCalledWith("integration_ghl");
    expect(createIntegrationsRepository).not.toHaveBeenCalled();
    expect(disconnectIntegration).not.toHaveBeenCalled();
  });
});
