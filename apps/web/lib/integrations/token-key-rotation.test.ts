import { describe, expect, it, vi } from "vitest";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
} from "./token-encryption";
import {
  rotateIntegrationTokenKey,
  rotateTokenValue,
  type IntegrationTokenRotationStore,
} from "./token-key-rotation";

const currentKey = "11".repeat(32);
const nextKey = "22".repeat(32);

function createStore(): IntegrationTokenRotationStore {
  return {
    rotate: vi.fn().mockResolvedValue({
      ghlIntegrations: 1,
      googleMeetIntegrations: 1,
      zoomIntegrations: 1,
    }),
  };
}

describe("integration token key rotation", () => {
  it("decrypts with the current key and encrypts with the next key", () => {
    const encrypted = encryptIntegrationToken("provider-token", {
      ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
    });

    const rotated = rotateTokenValue(encrypted, currentKey, nextKey);

    expect(rotated).not.toBe(encrypted);
    expect(
      decryptIntegrationToken(rotated, {
        ARGOS_TOKEN_ENCRYPTION_KEY: nextKey,
      }),
    ).toBe("provider-token");
    expect(() =>
      decryptIntegrationToken(rotated, {
        ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
      }),
    ).toThrow("Unable to decrypt integration token");
  });

  it("encrypts legacy plaintext values with the next key", () => {
    const rotated = rotateTokenValue("legacy-token", currentKey, nextKey);

    expect(
      decryptIntegrationToken(rotated, {
        ARGOS_TOKEN_ENCRYPTION_KEY: nextKey,
      }),
    ).toBe("legacy-token");
  });

  it("requires an active platform owner and explicit confirmation", async () => {
    const store = createStore();

    await expect(
      rotateIntegrationTokenKey(
        store,
        { email: "operator@argos.test", role: "operator", userId: "operator-1" },
        { confirmation: "ROTATE INTEGRATION TOKENS", reason: "Production recovery" },
        {
          ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
          ARGOS_TOKEN_ENCRYPTION_KEY_NEXT: nextKey,
        },
      ),
    ).resolves.toEqual({
      error: "Platform owner access required",
      ok: false,
      status: 403,
    });

    await expect(
      rotateIntegrationTokenKey(
        store,
        { email: "owner@argos.test", role: "owner", userId: "owner-1" },
        { confirmation: "rotate", reason: "Production recovery" },
        {
          ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
          ARGOS_TOKEN_ENCRYPTION_KEY_NEXT: nextKey,
        },
      ),
    ).resolves.toEqual({
      error: "Explicit rotation confirmation is required",
      ok: false,
      status: 400,
    });

    expect(store.rotate).not.toHaveBeenCalled();
  });

  it("rejects missing, identical, and invalid key configuration", async () => {
    const store = createStore();
    const actor = {
      email: "owner@argos.test",
      role: "owner" as const,
      userId: "owner-1",
    };
    const payload = {
      confirmation: "ROTATE INTEGRATION TOKENS",
      reason: "Production recovery",
    };

    await expect(
      rotateIntegrationTokenKey(store, actor, payload, {}),
    ).resolves.toMatchObject({ ok: false, status: 503 });
    await expect(
      rotateIntegrationTokenKey(store, actor, payload, {
        ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
        ARGOS_TOKEN_ENCRYPTION_KEY_NEXT: currentKey,
      }),
    ).resolves.toMatchObject({ ok: false, status: 503 });
    await expect(
      rotateIntegrationTokenKey(store, actor, payload, {
        ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
        ARGOS_TOKEN_ENCRYPTION_KEY_NEXT: "invalid",
      }),
    ).resolves.toMatchObject({ ok: false, status: 503 });

    expect(store.rotate).not.toHaveBeenCalled();
  });

  it("rotates every provider in one store operation", async () => {
    const store = createStore();

    await expect(
      rotateIntegrationTokenKey(
        store,
        { email: "owner@argos.test", role: "owner", userId: "owner-1" },
        {
          confirmation: "ROTATE INTEGRATION TOKENS",
          reason: "Restore worker token access",
        },
        {
          ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
          ARGOS_TOKEN_ENCRYPTION_KEY_NEXT: nextKey,
        },
      ),
    ).resolves.toEqual({
      data: {
        ghlIntegrations: 1,
        googleMeetIntegrations: 1,
        zoomIntegrations: 1,
      },
      ok: true,
    });

    expect(store.rotate).toHaveBeenCalledWith({
      actor: {
        email: "owner@argos.test",
        role: "owner",
        userId: "owner-1",
      },
      currentKey,
      nextKey,
      reason: "Restore worker token access",
    });
  });
});
