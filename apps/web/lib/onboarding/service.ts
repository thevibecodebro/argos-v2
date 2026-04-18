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
  }): Promise<void>;
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

  const existing = await repository.findOrganizationBySlug(slug);

  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "Organization slug already taken",
    };
  }

  const organization = await repository.createOrganization({
    name,
    slug,
    plan: "trial",
  });

  await repository.assignUserToOrganization({
    orgId: organization.id,
    role: "admin",
    userId: eligibleUser.data.id,
  });

  return {
    ok: true,
    data: serializeOrganization(organization),
  };
}

export async function joinOrganizationForUser(
  repository: OnboardingRepository,
  authUserId: string,
  input: { slug?: string },
): Promise<OnboardingResult<OnboardingOrganization>> {
  const eligibleUser = await loadEligibleUser(repository, authUserId);

  if (!eligibleUser.ok) {
    return eligibleUser;
  }

  const slug = input.slug?.trim().toLowerCase() ?? "";
  const slugError = validateSlug(slug);

  if (slugError) {
    return {
      ok: false,
      status: 400,
      error: slugError,
    };
  }

  return {
    ok: false,
    status: 403,
    error: "Use an invite to join an organization",
  };
}
