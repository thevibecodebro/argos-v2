import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookies,
  createIntegrationsRepository,
  exchangeGoogleCode,
  getAuthenticatedSupabaseUser,
  getGoogleUserProfile,
} = vi.hoisted(() => ({
  cookies: vi.fn(),
  createIntegrationsRepository: vi.fn(),
  exchangeGoogleCode: vi.fn(),
  getAuthenticatedSupabaseUser: vi.fn(),
  getGoogleUserProfile: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies }));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantRepository: vi.fn(async (repository) => repository),
}));

vi.mock("@argos-v2/google-workspace-client", async () => {
  const actual = await vi.importActual<typeof import("@argos-v2/google-workspace-client")>(
    "@argos-v2/google-workspace-client",
  );

  return {
    ...actual,
    exchangeGoogleCode,
    getGoogleUserProfile,
  };
});

describe("Google Meet OAuth routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("ARGOS_GOOGLE_MEET_ENABLED", "true");
    vi.stubEnv("GOOGLE_MEET_CLIENT_ID", "google-client");
    vi.stubEnv("GOOGLE_MEET_CLIENT_SECRET", "google-secret");
  });

  it("keeps organizer connection admin-only", async () => {
    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        org: { id: "org-1", slug: "argos" },
      }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const route = await import("../app/api/integrations/google-meet/connect/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/api/integrations/google-meet/connect"),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/settings/integrations?google_meet_error=forbidden",
    );
  });

  it("starts Google OAuth with offline access, restricted scopes, and a protected state cookie", async () => {
    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        role: "admin",
        org: { id: "org-1", slug: "argos" },
      }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });

    const route = await import("../app/api/integrations/google-meet/connect/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/api/integrations/google-meet/connect"),
    );
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(location.searchParams.get("access_type")).toBe("offline");
    expect(location.searchParams.get("scope")).toContain("drive.meet.readonly");
    expect(location.searchParams.get("scope")).toContain("calendar.events.readonly");
    expect(response.headers.get("set-cookie")).toContain(
      "argos_google_meet_oauth_nonce=",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("persists encrypted-token inputs after state validation and profile lookup", async () => {
    const repository = {
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        role: "admin",
        org: { id: "org-1", slug: "argos" },
      }),
      upsertGoogleMeetIntegration: vi.fn().mockResolvedValue(undefined),
    };
    createIntegrationsRepository.mockReturnValue(repository);
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    exchangeGoogleCode.mockResolvedValue({
      accessToken: "google-access",
      refreshToken: "google-refresh",
      tokenExpiresAt: new Date("2026-07-13T13:00:00.000Z"),
    });
    getGoogleUserProfile.mockResolvedValue({
      email: "organizer@example.com",
      id: "google-user-1",
    });

    const state = Buffer.from(
      JSON.stringify({ nonce: "nonce-123", orgId: "org-1", userId: "admin-1" }),
    ).toString("base64url");
    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: state }),
    });

    const route = await import("../app/api/integrations/google-meet/callback/route");
    const response = await route.GET(
      new Request(
        `https://app.argos.ai/api/integrations/google-meet/callback?code=auth-code&state=${state}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/settings/integrations?google_meet_connected=true",
    );
    expect(repository.upsertGoogleMeetIntegration).toHaveBeenCalledWith({
      accessToken: "google-access",
      connectedUserId: "admin-1",
      googleEmail: "organizer@example.com",
      googleUserId: "google-user-1",
      orgId: "org-1",
      refreshToken: "google-refresh",
      tokenExpiresAt: new Date("2026-07-13T13:00:00.000Z"),
    });
  });

  it("rejects callbacks when the returned state does not match the pending cookie", async () => {
    createIntegrationsRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        role: "admin",
        org: { id: "org-1", slug: "argos" },
      }),
      upsertGoogleMeetIntegration: vi.fn(),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "different-state" }),
    });
    const state = Buffer.from(
      JSON.stringify({ nonce: "nonce-123", orgId: "org-1", userId: "admin-1" }),
    ).toString("base64url");

    const route = await import("../app/api/integrations/google-meet/callback/route");
    const response = await route.GET(
      new Request(
        `https://app.argos.ai/api/integrations/google-meet/callback?code=auth-code&state=${state}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/settings/integrations?google_meet_error=state_mismatch",
    );
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
  });
});
