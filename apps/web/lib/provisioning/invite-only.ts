export class InviteOnlyProvisioningError extends Error {
  constructor(email: string) {
    super(`No active Argos invite exists for ${email}`);
    this.name = "InviteOnlyProvisioningError";
  }
}

export function normalizeProvisioningEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isInviteOnlyProvisioningEnabled(
  env: NodeJS.ProcessEnv = process.env,
) {
  return env.ARGOS_INVITE_ONLY === "true";
}

function readEmailSet(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map(normalizeProvisioningEmail)
      .filter(Boolean),
  );
}

export function canBypassInviteOnlyProvisioning(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const normalizedEmail = normalizeProvisioningEmail(email);
  const bootstrapAdminEmails = readEmailSet(env.ARGOS_BOOTSTRAP_ADMIN_EMAILS);
  const platformBootstrapOwnerEmails = readEmailSet(
    env.ARGOS_PLATFORM_BOOTSTRAP_OWNER_EMAILS,
  );
  const trustedPlatformOwnerEmails = readEmailSet(
    env.ARGOS_PLATFORM_TRUSTED_OWNER_EMAILS,
  );

  return (
    bootstrapAdminEmails.has(normalizedEmail) ||
    platformBootstrapOwnerEmails.has(normalizedEmail) ||
    trustedPlatformOwnerEmails.has(normalizedEmail)
  );
}
