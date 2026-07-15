import { beforeEach, describe, expect, it, vi } from "vitest";

const createIntegrationTokenRotationStore = vi.fn();
const getPlatformApiAccess = vi.fn();
const rotateIntegrationTokenKey = vi.fn();

vi.mock("@/lib/platform/auth", () => ({
  getPlatformApiAccess,
}));

vi.mock("@/lib/integrations/token-key-rotation", () => ({
  createIntegrationTokenRotationStore,
  rotateIntegrationTokenKey,
}));

describe("platform integration token rotation route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createIntegrationTokenRotationStore.mockReset();
    getPlatformApiAccess.mockReset();
    rotateIntegrationTokenKey.mockReset();

    createIntegrationTokenRotationStore.mockReturnValue({ name: "rotation-store" });
    getPlatformApiAccess.mockResolvedValue({
      ok: true,
      staff: { role: "owner", status: "active", userId: "owner-1" },
      user: { email: "owner@argos.test", id: "owner-1" },
    });
    rotateIntegrationTokenKey.mockResolvedValue({
      data: {
        ghlIntegrations: 1,
        googleMeetIntegrations: 1,
        zoomIntegrations: 1,
      },
      ok: true,
    });
  });

  it("requires authenticated platform MFA access", async () => {
    getPlatformApiAccess.mockResolvedValueOnce({
      error: "Platform multi-factor authentication required",
      ok: false,
      status: 403,
    });

    const route = await import(
      "../app/api/platform/integration-token-rotation/route"
    );
    const response = await route.POST(
      new Request("http://localhost/api/platform/integration-token-rotation", {
        body: JSON.stringify({
          confirmation: "ROTATE INTEGRATION TOKENS",
          reason: "Production recovery",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Platform multi-factor authentication required",
    });
    expect(rotateIntegrationTokenKey).not.toHaveBeenCalled();
  });

  it("delegates rotation to the owner-only audited service", async () => {
    const route = await import(
      "../app/api/platform/integration-token-rotation/route"
    );
    const payload = {
      confirmation: "ROTATE INTEGRATION TOKENS",
      reason: "Restore worker token access",
    };
    const response = await route.POST(
      new Request("http://localhost/api/platform/integration-token-rotation", {
        body: JSON.stringify(payload),
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ghlIntegrations: 1,
      googleMeetIntegrations: 1,
      zoomIntegrations: 1,
    });
    expect(rotateIntegrationTokenKey).toHaveBeenCalledWith(
      { name: "rotation-store" },
      {
        email: "owner@argos.test",
        role: "owner",
        userId: "owner-1",
      },
      payload,
    );
  });
});
