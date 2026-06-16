import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createIntegrationsRepository = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantRepository: vi.fn(async (repository) => repository),
}));

describe("integration connect routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    getAuthenticatedSupabaseUser.mockReset();
    createIntegrationsRepository.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

    expect(response.headers.get("location")).toBe("https://app.argos.ai/settings?zoom_error=forbidden");
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

    expect(response.headers.get("location")).toBe("https://app.argos.ai/settings?ghl_error=forbidden");
  });

  it("does not use an untrusted forwarded host for Zoom OAuth redirects in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");
    vi.stubEnv("ZOOM_CLIENT_ID", "zoom-client");
    vi.stubEnv("ZOOM_CLIENT_SECRET", "zoom-secret");

    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        role: "admin",
        org: { id: "org-1", slug: "argos" },
      }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const route = await import("../app/api/integrations/zoom/connect/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/api/integrations/zoom/connect", {
        headers: {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      }),
    );

    const location = new URL(response.headers.get("location") ?? "");

    expect(location.origin + location.pathname).toBe("https://zoom.us/oauth/authorize");
    expect(location.searchParams.get("redirect_uri")).toBe(
      "https://app.argos.ai/api/integrations/zoom/callback",
    );
  });

  it("does not use an untrusted host for Zoom connect error redirects in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        org: { id: "org-1", slug: "argos" },
      }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const route = await import("../app/api/integrations/zoom/connect/route");
    const response = await route.GET(
      new Request("https://evil.example/api/integrations/zoom/connect", {
        headers: {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/settings?zoom_error=forbidden",
    );
  });

  it("does not use an untrusted host for GHL connect error redirects in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        role: "admin",
        org: { id: "org-1", slug: "argos" },
      }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const route = await import("../app/api/integrations/ghl/connect/route");
    const response = await route.GET(
      new Request("https://evil.example/api/integrations/ghl/connect", {
        headers: {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/settings?ghl_error=not_configured",
    );
  });

  it("keeps GHL OAuth unavailable unless explicitly enabled in production config", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");
    vi.stubEnv("ARGOS_GHL_ENABLED", "false");
    vi.stubEnv("GHL_CLIENT_ID", "ghl-client-id");
    vi.stubEnv("GHL_CLIENT_SECRET", "ghl-secret");

    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        role: "admin",
        org: { id: "org-1", slug: "argos" },
      }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const route = await import("../app/api/integrations/ghl/connect/route");
    const response = await route.GET(new Request("https://app.argos.ai/api/integrations/ghl/connect"));

    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/settings?ghl_error=not_configured",
    );
  });
});
