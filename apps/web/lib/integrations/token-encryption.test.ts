import { describe, expect, it, vi } from "vitest";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
  isEncryptedIntegrationToken,
} from "./token-encryption";

vi.mock("server-only", () => ({}));

const base64Key = Buffer.alloc(32, 7).toString("base64");
const hexKey = Buffer.alloc(32, 11).toString("hex");

describe("integration token encryption", () => {
  it("encrypts and decrypts tokens with a versioned prefix using a base64 key", () => {
    const ciphertext = encryptIntegrationToken("zoom-access-token", {
      ARGOS_TOKEN_ENCRYPTION_KEY: base64Key,
    });

    expect(ciphertext).not.toBe("zoom-access-token");
    expect(ciphertext.startsWith("argos:v1:")).toBe(true);
    expect(isEncryptedIntegrationToken(ciphertext)).toBe(true);
    expect(decryptIntegrationToken(ciphertext, {
      ARGOS_TOKEN_ENCRYPTION_KEY: base64Key,
    })).toBe("zoom-access-token");
  });

  it("supports a 32-byte hex key", () => {
    const ciphertext = encryptIntegrationToken("ghl-refresh-token", {
      ARGOS_TOKEN_ENCRYPTION_KEY: hexKey,
    });

    expect(decryptIntegrationToken(ciphertext, {
      ARGOS_TOKEN_ENCRYPTION_KEY: hexKey,
    })).toBe("ghl-refresh-token");
  });

  it("rejects tampered encrypted tokens", () => {
    const ciphertext = encryptIntegrationToken("zoom-refresh-token", {
      ARGOS_TOKEN_ENCRYPTION_KEY: base64Key,
    });
    const parts = ciphertext.split(":");
    parts[3] = `${parts[3]?.slice(0, -1)}${parts[3]?.endsWith("A") ? "B" : "A"}`;
    const tampered = parts.join(":");

    expect(() => decryptIntegrationToken(tampered, {
      ARGOS_TOKEN_ENCRYPTION_KEY: base64Key,
    })).toThrow("Unable to decrypt integration token");
  });

  it("requires a configured key before encrypting new tokens", () => {
    expect(() => encryptIntegrationToken("token", {})).toThrow(
      "ARGOS_TOKEN_ENCRYPTION_KEY is required",
    );
  });

  it("rejects invalid key sizes", () => {
    expect(() => encryptIntegrationToken("token", {
      ARGOS_TOKEN_ENCRYPTION_KEY: Buffer.alloc(16, 1).toString("base64"),
    })).toThrow("ARGOS_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  });

  it("rejects malformed base64 keys that Node could decode permissively", () => {
    expect(Buffer.from(`${base64Key}!`, "base64").length).toBe(32);
    expect(() => encryptIntegrationToken("token", {
      ARGOS_TOKEN_ENCRYPTION_KEY: `${base64Key}!`,
    })).toThrow("ARGOS_TOKEN_ENCRYPTION_KEY must be 64 hex chars or valid base64/base64url");
  });

  it("returns legacy plaintext values without requiring a key", () => {
    expect(decryptIntegrationToken("legacy-plaintext-token", {})).toBe("legacy-plaintext-token");
    expect(isEncryptedIntegrationToken("legacy-plaintext-token")).toBe(false);
  });
});
