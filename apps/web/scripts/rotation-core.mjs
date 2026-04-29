import crypto from "node:crypto";

export const TOKEN_PREFIX = "argos:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function isEncryptedIntegrationToken(value) {
  return typeof value === "string" && value.startsWith(TOKEN_PREFIX);
}

export function parseTokenEncryptionKey(rawKey) {
  if (!rawKey) {
    throw new Error("ARGOS_TOKEN_ENCRYPTION_KEY is required.");
  }

  const trimmed = rawKey.trim();

  if (/^[\da-f]+$/i.test(trimmed) && trimmed.length === 64) {
    return Buffer.from(trimmed, "hex");
  }

  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed) || /=/.test(trimmed.replace(/=+$/, ""))) {
    throw new Error("ARGOS_TOKEN_ENCRYPTION_KEY must be 64 hex chars or valid base64/base64url");
  }

  const unpadded = trimmed.replace(/=+$/, "");

  if (unpadded.length % 4 === 1) {
    throw new Error("ARGOS_TOKEN_ENCRYPTION_KEY must be 64 hex chars or valid base64/base64url");
  }

  const normalized = unpadded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
  const key = Buffer.from(padded, "base64");
  const canonicalBase64 = key.toString("base64").replace(/=+$/, "");
  const canonicalBase64Url = key.toString("base64url");

  if (unpadded !== canonicalBase64 && unpadded !== canonicalBase64Url) {
    throw new Error("ARGOS_TOKEN_ENCRYPTION_KEY must be 64 hex chars or valid base64/base64url");
  }

  if (key.length !== 32) {
    throw new Error("ARGOS_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  }

  return key;
}

export function encryptIntegrationToken(value, encryptionKey) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv, {
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

export function decryptIntegrationToken(value, encryptionKey) {
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

    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Unable to decrypt integration token");
  }
}

export function planTokenRotationForRow(row, tokenColumns, encryptionKey) {
  const updates = {};
  const corruptColumns = [];

  for (const column of tokenColumns) {
    const value = row[column];

    if (typeof value !== "string" || !value) {
      continue;
    }

    if (isEncryptedIntegrationToken(value)) {
      try {
        decryptIntegrationToken(value, encryptionKey);
      } catch {
        corruptColumns.push(column);
      }
      continue;
    }

    updates[column] = encryptIntegrationToken(value, encryptionKey);
  }

  return { corruptColumns, updates };
}
