import { describe, expect, it } from "vitest";

const coreModuleUrl = new URL("../../scripts/rotation-core.mjs", import.meta.url).href;
const key = Buffer.alloc(32, 17).toString("base64");

describe("integration token rotation core", () => {
  it("rejects malformed base64 keys that Node could decode permissively", async () => {
    const core = await import(coreModuleUrl);
    const malformedKey = `${key}!`;

    expect(Buffer.from(malformedKey, "base64").length).toBe(32);
    expect(() => core.parseTokenEncryptionKey(malformedKey)).toThrow(
      "ARGOS_TOKEN_ENCRYPTION_KEY must be 64 hex chars or valid base64/base64url",
    );
  });

  it("flags corrupt argos:v1 ciphertexts instead of treating them as safe", async () => {
    const core = await import(coreModuleUrl);
    const rotationKey = core.parseTokenEncryptionKey(key);
    const plan = core.planTokenRotationForRow(
      {
        id: "row-1",
        org_id: "org-1",
        access_token: "argos:v1:not-valid:ciphertext:payload",
        refresh_token: "legacy-refresh",
      },
      ["access_token", "refresh_token"],
      rotationKey,
    );

    expect(plan.corruptColumns).toEqual(["access_token"]);
    expect(plan.updates).toHaveProperty("refresh_token");
    expect(plan.updates).not.toHaveProperty("access_token");
  });
});
