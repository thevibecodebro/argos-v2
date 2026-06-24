import { beforeEach, describe, expect, it, vi } from "vitest";

const cookies = vi.fn();
const getAuthenticatedSupabaseUser = vi.fn();
const createIntegrationsRepository = vi.fn();
const exchangeGhlCode = vi.fn();

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantRepository: vi.fn(async (repository) => repository),
}));

vi.mock("@/lib/integrations/oauth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/integrations/oauth")>(
    "@/lib/integrations/oauth",
  );

  return {
    ...actual,
    exchangeGhlCode,
  };
});

describe("ghl callback route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    cookies.mockReset();
    getAuthenticatedSupabaseUser.mockReset();
    createIntegrationsRepository.mockReset();
    exchangeGhlCode.mockReset();
  });

  it("returns not_configured before exchanging codes when GHL is not explicitly enabled", async () => {
    vi.stubEnv("ARGOS_GHL_ENABLED", "false");
    vi.stubEnv("GHL_CLIENT_ID", "ghl-client-id");
    vi.stubEnv("GHL_CLIENT_SECRET", "ghl-secret");

    const state = Buffer.from(
      JSON.stringify({
        nonce: "nonce-123",
        orgId: "org-1",
        userId: "user-1",
      }),
    ).toString("base64url");

    const route = await import("../app/api/integrations/ghl/callback/route");
    const response = await route.GET(
      new Request(
        `https://app.argos.ai/api/integrations/ghl/callback?code=auth-code&state=${state}`,
      ),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/settings?ghl_error=not_configured");
    expect(exchangeGhlCode).not.toHaveBeenCalled();
    expect(createIntegrationsRepository).not.toHaveBeenCalled();
  });

  it("rejects code-only callbacks before exchanging a GHL authorization code", async () => {
    vi.stubEnv("ARGOS_GHL_ENABLED", "true");
    vi.stubEnv("GHL_CLIENT_ID", "ghl-client-id");
    vi.stubEnv("GHL_CLIENT_SECRET", "ghl-secret");
    vi.stubEnv("GHL_REDIRECT_URI", "https://app.argos.ai/api/integrations/leadconnector/callback");

    const repository = {
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        role: "admin",
        org: { id: "org-1", slug: "argos" },
      }),
      upsertGhlIntegration: vi.fn().mockResolvedValue(undefined),
    };
    createIntegrationsRepository.mockReturnValue(repository);
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    exchangeGhlCode.mockResolvedValue({
      accessToken: "ghl-access",
      refreshToken: "ghl-refresh",
      tokenExpiresAt: new Date("2026-06-18T12:00:00.000Z"),
      locationId: "location-1",
      locationName: "Sales Floor",
    });

    const state = Buffer.from(
      JSON.stringify({
        nonce: "nonce-123",
        orgId: "org-1",
        userId: "user-1",
      }),
    ).toString("base64url");
    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: state }),
    });

    const route = await import("../app/api/integrations/ghl/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/api/integrations/leadconnector/callback?code=auth-code"),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/settings?ghl_error=missing_params");
    expect(getAuthenticatedSupabaseUser).not.toHaveBeenCalled();
    expect(createIntegrationsRepository).not.toHaveBeenCalled();
    expect(exchangeGhlCode).not.toHaveBeenCalled();
    expect(repository.upsertGhlIntegration).not.toHaveBeenCalled();
  });

  it("persists the GHL integration when the returned state matches the pending OAuth cookie", async () => {
    vi.stubEnv("ARGOS_GHL_ENABLED", "true");
    vi.stubEnv("GHL_CLIENT_ID", "ghl-client-id");
    vi.stubEnv("GHL_CLIENT_SECRET", "ghl-secret");
    vi.stubEnv("GHL_REDIRECT_URI", "https://app.argos.ai/api/integrations/leadconnector/callback");

    const repository = {
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        role: "admin",
        org: { id: "org-1", slug: "argos" },
      }),
      upsertGhlIntegration: vi.fn().mockResolvedValue(undefined),
    };
    createIntegrationsRepository.mockReturnValue(repository);
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    exchangeGhlCode.mockResolvedValue({
      accessToken: "ghl-access",
      refreshToken: "ghl-refresh",
      tokenExpiresAt: new Date("2026-06-18T12:00:00.000Z"),
      locationId: "location-1",
      locationName: "Sales Floor",
    });

    const state = Buffer.from(
      JSON.stringify({
        nonce: "nonce-123",
        orgId: "org-1",
        userId: "user-1",
      }),
    ).toString("base64url");
    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: state }),
    });

    const route = await import("../app/api/integrations/ghl/callback/route");
    const response = await route.GET(
      new Request(
        `https://app.argos.ai/api/integrations/leadconnector/callback?code=auth-code&state=${state}`,
      ),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/settings?ghl_connected=true");
    expect(exchangeGhlCode).toHaveBeenCalledWith(
      "auth-code",
      "https://app.argos.ai/api/integrations/leadconnector/callback",
    );
    expect(repository.upsertGhlIntegration).toHaveBeenCalledWith({
      accessToken: "ghl-access",
      locationId: "location-1",
      locationName: "Sales Floor",
      orgId: "org-1",
      refreshToken: "ghl-refresh",
      tokenExpiresAt: new Date("2026-06-18T12:00:00.000Z"),
    });
  });
});
