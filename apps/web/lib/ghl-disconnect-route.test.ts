import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createIntegrationsRepository = vi.fn();
const disconnectIntegration = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository,
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
    getAuthenticatedSupabaseUser.mockReset();
    createIntegrationsRepository.mockReset();
    disconnectIntegration.mockReset();
  });

  it("returns not_configured without disconnecting when GHL is not explicitly enabled", async () => {
    vi.stubEnv("ARGOS_GHL_ENABLED", "false");
    vi.stubEnv("GHL_CLIENT_ID", "ghl-client-id");
    vi.stubEnv("GHL_CLIENT_SECRET", "ghl-secret");
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

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
});
