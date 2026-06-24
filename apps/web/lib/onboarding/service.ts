import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type { AppUserRole } from "@/lib/users/roles";

type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
};

type OnboardingResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

type AccessEnvSource = Partial<Record<string, string | undefined>>;
export type OnboardingAccessMode = "invite-only" | "bootstrap-admin" | "open";

type BootstrapOrganizationCreationResult =
  | { status: "created"; organization: OrganizationRecord }
  | { status: "organization-exists" }
  | { status: "user-claimed" };

type OrganizationForUserCreationResult =
  | { status: "created"; organization: OrganizationRecord }
  | { status: "user-claimed" };

export type OnboardingOrganization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
};

export interface OnboardingRepository {
  assignUserToOrganization(input: {
    orgId: string;
    role: AppUserRole;
    userId: string;
  }): Promise<boolean>;
  createBootstrapOrganizationForUserIfNone(input: {
    name: string;
    plan: string;
    slug: string;
    userId: string;
  }): Promise<BootstrapOrganizationCreationResult>;
  createOrganizationForUser(input: {
    name: string;
    plan: string;
    slug: string;
    userId: string;
  }): Promise<OrganizationForUserCreationResult>;
  createOrganization(input: {
    name: string;
    plan: string;
    slug: string;
  }): Promise<OrganizationRecord>;
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findOrganizationBySlug(slug: string): Promise<OrganizationRecord | null>;
}

function serializeOrganization(record: OrganizationRecord): OnboardingOrganization {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
  };
}

function validateSlug(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();

  if (!normalized) {
    return "slug is required";
  }

  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return "slug must only contain lowercase letters, numbers, and hyphens";
  }

  return null;
}

export function isInviteOnlyAccessEnabled(env: AccessEnvSource = process.env): boolean {
  return env.ARGOS_INVITE_ONLY !== "false";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isBootstrapAdminEmail(
  email: string,
  env: AccessEnvSource = process.env,
): boolean {
  const bootstrapEmails = env.ARGOS_BOOTSTRAP_ADMIN_EMAILS ?? "";

  return bootstrapEmails
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean)
    .includes(normalizeEmail(email));
}

export function getOnboardingAccessModeForEmail(
  email: string,
  env: AccessEnvSource = process.env,
): OnboardingAccessMode {
  if (!isInviteOnlyAccessEnabled(env)) {
    return "open";
  }

  return isBootstrapAdminEmail(email, env) ? "bootstrap-admin" : "invite-only";
}

function validateOrganizationInput(input: { name?: string; slug?: string }):
  | {
      ok: true;
      data: { name: string; slug: string };
    }
  | { ok: false; status: 400; error: string } {
  const name = input.name?.trim() ?? "";
  const slug = input.slug?.trim().toLowerCase() ?? "";

  if (!name) {
    return {
      ok: false,
      status: 400,
      error: "name is required",
    };
  }

  const slugError = validateSlug(slug);

  if (slugError) {
    return {
      ok: false,
      status: 400,
      error: slugError,
    };
  }

  return {
    ok: true,
    data: { name, slug },
  };
}

async function loadEligibleUser(repository: OnboardingRepository, authUserId: string) {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "User is not provisioned in the app database",
    };
  }

  if (user.org) {
    return {
      ok: false as const,
      status: 409 as const,
      error: "User already belongs to an organization",
    };
  }

  return {
    ok: true as const,
    data: user,
  };
}

export async function createOrganizationForUser(
  repository: OnboardingRepository,
  authUserId: string,
  input: { name?: string; slug?: string },
): Promise<OnboardingResult<OnboardingOrganization>> {
  const eligibleUser = await loadEligibleUser(repository, authUserId);

  if (!eligibleUser.ok) {
    return eligibleUser;
  }

  const inviteOnlyAccessEnabled = isInviteOnlyAccessEnabled();

  if (
    inviteOnlyAccessEnabled &&
    !isBootstrapAdminEmail(eligibleUser.data.email)
  ) {
    return {
      ok: false,
      status: 403,
      error: "Organization creation requires an invite",
    };
  }

  const validatedInput = validateOrganizationInput(input);

  if (!validatedInput.ok) {
    return validatedInput;
  }

  const { name, slug } = validatedInput.data;

  if (inviteOnlyAccessEnabled) {
    const bootstrapResult = await repository.createBootstrapOrganizationForUserIfNone({
      name,
      slug,
      plan: "trial",
      userId: eligibleUser.data.id,
    });

    if (bootstrapResult.status === "organization-exists") {
      return {
        ok: false,
        status: 409,
        error: "Bootstrap organization already exists",
      };
    }

    if (bootstrapResult.status === "user-claimed") {
      return {
        ok: false,
        status: 409,
        error: "User already belongs to an organization",
      };
    }

    return {
      ok: true,
      data: serializeOrganization(bootstrapResult.organization),
    };
  }

  const existing = await repository.findOrganizationBySlug(slug);

  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "Organization slug already taken",
    };
  }

  const creationResult = await repository.createOrganizationForUser({
    name,
    slug,
    plan: "trial",
    userId: eligibleUser.data.id,
  });

  if (creationResult.status === "user-claimed") {
    return {
      ok: false,
      status: 409,
      error: "User already belongs to an organization",
    };
  }

  return {
    ok: true,
    data: serializeOrganization(creationResult.organization),
  };
}

export async function joinOrganizationForUser(
  repository: OnboardingRepository,
  authUserId: string,
  _input: { slug?: string },
): Promise<OnboardingResult<OnboardingOrganization>> {
  const eligibleUser = await loadEligibleUser(repository, authUserId);

  if (!eligibleUser.ok) {
    return eligibleUser;
  }

  return {
    ok: false,
    status: 403,
    error: "Organization joins require an invite",
  };
}
