import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
  isEncryptedIntegrationToken,
} from "./token-encryption";
import { SupabaseIntegrationsRepository } from "./supabase-repository";

vi.mock("server-only", () => ({}));

const key = Buffer.alloc(32, 13).toString("base64");

afterEach(() => {
  vi.unstubAllEnvs();
});

function createSupabaseMock() {
  const state: {
    upsertPayloads: Record<string, unknown>[];
    updatePayloads: Record<string, unknown>[];
    maybeSingleData: Record<string, unknown> | null;
  } = {
    upsertPayloads: [],
    updatePayloads: [],
    maybeSingleData: null,
  };

  const builder = {
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: state.maybeSingleData, error: null })),
    select: vi.fn(() => builder),
    update: vi.fn((payload: Record<string, unknown>) => {
      state.updatePayloads.push(payload);
      return builder;
    }),
    upsert: vi.fn(async (payload: Record<string, unknown>) => {
      state.upsertPayloads.push(payload);
      return { error: null };
    }),
  };

  return {
    state,
    client: {
      from: vi.fn(() => builder),
    },
  };
}

describe("SupabaseIntegrationsRepository token encryption", () => {
  it("encrypts Zoom and GHL tokens before upsert persistence", async () => {
    vi.stubEnv("ARGOS_TOKEN_ENCRYPTION_KEY", key);
    const supabase = createSupabaseMock();
    const repository = new SupabaseIntegrationsRepository(supabase.client as any);

    await repository.upsertZoomIntegration({
      accessToken: "zoom-access",
      connectedUserId: "user-1",
      orgId: "org-1",
      refreshToken: "zoom-refresh",
      tokenExpiresAt: new Date("2026-04-04T12:00:00.000Z"),
      webhookId: "webhook-1",
      webhookToken: "zoom-webhook-token",
      zoomAccountId: "zoom-account-1",
      zoomUserId: "zoom-user-1",
    });
    await repository.upsertGhlIntegration({
      accessToken: "ghl-access",
      locationId: "location-1",
      locationName: "Location One",
      orgId: "org-1",
      refreshToken: "ghl-refresh",
      tokenExpiresAt: new Date("2026-04-04T12:00:00.000Z"),
    });

    const zoomPayload = supabase.state.upsertPayloads[0];
    const ghlPayload = supabase.state.upsertPayloads[1];

    expect(zoomPayload.access_token).not.toBe("zoom-access");
    expect(zoomPayload.connected_user_id).toBe("user-1");
    expect(zoomPayload.refresh_token).not.toBe("zoom-refresh");
    expect(zoomPayload.webhook_token).not.toBe("zoom-webhook-token");
    expect(isEncryptedIntegrationToken(zoomPayload.access_token as string)).toBe(true);
    expect(decryptIntegrationToken(zoomPayload.access_token as string)).toBe("zoom-access");
    expect(decryptIntegrationToken(zoomPayload.refresh_token as string)).toBe("zoom-refresh");
    expect(decryptIntegrationToken(zoomPayload.webhook_token as string)).toBe("zoom-webhook-token");

    expect(ghlPayload.access_token).not.toBe("ghl-access");
    expect(ghlPayload.refresh_token).not.toBe("ghl-refresh");
    expect(decryptIntegrationToken(ghlPayload.access_token as string)).toBe("ghl-access");
    expect(decryptIntegrationToken(ghlPayload.refresh_token as string)).toBe("ghl-refresh");
  });

  it("decrypts encrypted Zoom tokens before returning them to provider services", async () => {
    vi.stubEnv("ARGOS_TOKEN_ENCRYPTION_KEY", key);
    const supabase = createSupabaseMock();
    const repository = new SupabaseIntegrationsRepository(supabase.client as any);
    supabase.state.maybeSingleData = {
      access_token: encryptForTest("zoom-access"),
      refresh_token: encryptForTest("zoom-refresh"),
      token_expires_at: "2026-04-04T12:00:00.000Z",
      webhook_id: "webhook-1",
    };

    const integration = await repository.findZoomIntegrationForDisconnect("org-1", "user-1");

    expect(integration).toMatchObject({
      accessToken: "zoom-access",
      refreshToken: "zoom-refresh",
      webhookId: "webhook-1",
    });
  });

  it("keeps legacy plaintext Zoom tokens readable until rotation", async () => {
    const supabase = createSupabaseMock();
    const repository = new SupabaseIntegrationsRepository(supabase.client as any);
    supabase.state.maybeSingleData = {
      access_token: "legacy-access",
      refresh_token: "legacy-refresh",
      token_expires_at: "2026-04-04T12:00:00.000Z",
      webhook_id: null,
    };

    const integration = await repository.findZoomIntegrationForDisconnect("org-1", "user-1");

    expect(integration).toMatchObject({
      accessToken: "legacy-access",
      refreshToken: "legacy-refresh",
    });
  });

  it("encrypts refreshed Zoom tokens before update persistence", async () => {
    vi.stubEnv("ARGOS_TOKEN_ENCRYPTION_KEY", key);
    const supabase = createSupabaseMock();
    const repository = new SupabaseIntegrationsRepository(supabase.client as any);

    await repository.updateZoomTokens("org-1", "user-1", {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      tokenExpiresAt: new Date("2026-04-04T12:00:00.000Z"),
    });

    const updatePayload = supabase.state.updatePayloads[0];
    expect(updatePayload.access_token).not.toBe("new-access");
    expect(updatePayload.refresh_token).not.toBe("new-refresh");
    expect(decryptIntegrationToken(updatePayload.access_token as string)).toBe("new-access");
    expect(decryptIntegrationToken(updatePayload.refresh_token as string)).toBe("new-refresh");
  });
});

function encryptForTest(value: string) {
  return encryptIntegrationToken(value);
}
