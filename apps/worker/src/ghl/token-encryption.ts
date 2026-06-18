import crypto from "node:crypto";

type EnvSource = Partial<Record<"ARGOS_TOKEN_ENCRYPTION_KEY", string | undefined>>;

const TOKEN_PREFIX = "argos:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encryptIntegrationToken(value: string, env: EnvSource = process.env as EnvSource) {
  if (isEncryptedIntegrationToken(value)) {
    return value;
  }

  const key = resolveTokenEncryptionKey(env);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    TOKEN_PREFIX.slice(0, -1),
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    authTag.toString("base64url"),
  ].join(":");
}

export function decryptIntegrationToken(value: string, env: EnvSource = process.env as EnvSource) {
  if (!isEncryptedIntegrationToken(value)) {
    return value;
  }

  const key = resolveTokenEncryptionKey(env);
  const parts = value.split(":");

  if (parts.length !== 5 || parts[0] !== "argos" || parts[1] !== "v1") {
    throw new Error("Unable to decrypt integration token");
  }

  try {
    const iv = Buffer.from(parts[2] ?? "", "base64url");
    const ciphertext = Buffer.from(parts[3] ?? "", "base64url");
    const authTag = Buffer.from(parts[4] ?? "", "base64url");

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted token payload");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Unable to decrypt integration token");
  }
}

function isEncryptedIntegrationToken(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(TOKEN_PREFIX);
}

function resolveTokenEncryptionKey(env: EnvSource) {
  const rawKey = env.ARGOS_TOKEN_ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    throw new Error("ARGOS_TOKEN_ENCRYPTION_KEY is required");
  }

  const key = parseTokenEncryptionKey(rawKey);

  if (key.length !== 32) {
    throw new Error("ARGOS_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  }

  return key;
}

function parseTokenEncryptionKey(rawKey: string) {
  if (/^[\da-f]+$/i.test(rawKey) && rawKey.length === 64) {
    return Buffer.from(rawKey, "hex");
  }

  const normalized = rawKey.replace(/=+$/, "").replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(`${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`, "base64");
}
