import { beforeEach, describe, expect, it, vi } from "vitest";

const cookies = vi.fn();
const getAuthenticatedSupabaseUser = vi.fn();
const createIntegrationsRepository = vi.fn();
const exchangeZoomCode = vi.fn();
const registerZoomWebhook = vi.fn();

vi.mock("next/headers", () => ({
  cookies,
}));

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
    exchangeZoomCode,
    registerZoomWebhook,
  };
});

describe("zoom callback route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    cookies.mockReset();
    getAuthenticatedSupabaseUser.mockReset();
    createIntegrationsRepository.mockReset();
    exchangeZoomCode.mockReset();
    registerZoomWebhook.mockReset();
  });

  it("persists a webhook token and registers the Zoom webhook on success", async () => {
    const repository = {
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        org: { id: "org-1", slug: "argos" },
      }),
      upsertZoomIntegration: vi.fn().mockResolvedValue(undefined),
    };
    createIntegrationsRepository.mockReturnValue(repository);
    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "nonce-123" }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    exchangeZoomCode.mockResolvedValue({
      accessToken: "zoom-access",
      refreshToken: "zoom-refresh",
      tokenExpiresAt: new Date("2026-04-04T12:00:00.000Z"),
      zoomAccountId: "zoom-account-1",
      zoomUserId: "zoom-user-1",
    });
    registerZoomWebhook.mockResolvedValue(undefined);

    const state = Buffer.from(
      JSON.stringify({
        nonce: "nonce-123",
        orgId: "org-1",
        userId: "user-1",
      }),
    ).toString("base64url");

    const route = await import("../app/api/integrations/zoom/callback/route");
    const response = await route.GET(
      new Request(
        `https://app.argos.ai/api/integrations/zoom/callback?code=auth-code&state=${state}`,
      ),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/settings?zoom_connected=true");
    expect(repository.upsertZoomIntegration).toHaveBeenCalledTimes(1);
    const savedIntegration = repository.upsertZoomIntegration.mock.calls[0]?.[0];
    expect(savedIntegration).toMatchObject({
      accessToken: "zoom-access",
      orgId: "org-1",
      refreshToken: "zoom-refresh",
      zoomAccountId: "zoom-account-1",
      zoomUserId: "zoom-user-1",
    });
    expect(savedIntegration.webhookToken).toEqual(expect.any(String));
    expect(registerZoomWebhook).toHaveBeenCalledWith({
      accessToken: "zoom-access",
      webhookToken: savedIntegration.webhookToken,
      webhookUrl: "https://app.argos.ai/api/webhooks/zoom",
      zoomAccountId: "zoom-account-1",
    });
  });

  it("keeps the integration connected and surfaces a notice when webhook registration fails", async () => {
    const repository = {
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        org: { id: "org-1", slug: "argos" },
      }),
      upsertZoomIntegration: vi.fn().mockResolvedValue(undefined),
    };
    createIntegrationsRepository.mockReturnValue(repository);
    cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "nonce-123" }),
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    exchangeZoomCode.mockResolvedValue({
      accessToken: "zoom-access",
      refreshToken: "zoom-refresh",
      tokenExpiresAt: new Date("2026-04-04T12:00:00.000Z"),
      zoomAccountId: "zoom-account-1",
      zoomUserId: "zoom-user-1",
    });
    registerZoomWebhook.mockRejectedValue(new Error("boom"));

    const state = Buffer.from(
      JSON.stringify({
        nonce: "nonce-123",
        orgId: "org-1",
        userId: "user-1",
      }),
    ).toString("base64url");

    const route = await import("../app/api/integrations/zoom/callback/route");
    const response = await route.GET(
      new Request(
        `https://app.argos.ai/api/integrations/zoom/callback?code=auth-code&state=${state}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/settings?zoom_connected=true&zoom_notice=webhook_registration_failed",
    );
    expect(repository.upsertZoomIntegration).toHaveBeenCalledTimes(1);
  });
});
