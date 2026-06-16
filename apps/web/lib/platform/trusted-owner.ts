import type {
  PlatformStaffRole,
  PlatformStaffStatus,
} from "./repository";

export function normalizePlatformEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getTrustedPlatformOwnerEmails(env: NodeJS.ProcessEnv = process.env) {
  return new Set(
    (env.ARGOS_PLATFORM_TRUSTED_OWNER_EMAILS ?? "")
      .split(",")
      .map(normalizePlatformEmail)
      .filter(Boolean),
  );
}

export function isTrustedPlatformOwnerEmail(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!email) {
    return false;
  }

  return getTrustedPlatformOwnerEmails(env).has(normalizePlatformEmail(email));
}

export function isTrustedPlatformOwner(
  input: {
    email?: string | null;
    role?: PlatformStaffRole | null;
    status?: PlatformStaffStatus | null;
  },
  env: NodeJS.ProcessEnv = process.env,
) {
  return (
    input.role === "owner" &&
    input.status === "active" &&
    isTrustedPlatformOwnerEmail(input.email, env)
  );
}
