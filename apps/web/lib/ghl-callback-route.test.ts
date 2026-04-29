import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createIntegrationsRepository = vi.fn();
const exchangeGhlCode = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository,
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
});
