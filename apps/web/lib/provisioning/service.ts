import type { AppUserRole } from "@/lib/users/roles";

type ExistingProvisionedUser = {
  id: string;
  orgId: string | null;
  email: string;
  role: AppUserRole | null;
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export interface ProvisioningRepository {
  findUserById(userId: string): Promise<ExistingProvisionedUser | null>;
  createOrganization(input: {
    name: string;
    slug: string;
    plan: string;
  }): Promise<{ id: string }>;
  createUser(input: {
    id: string;
    orgId: string;
    email: string;
    role: "admin";
    firstName: string | null;
    lastName: string | null;
    displayNameSet: boolean;
  }): Promise<void>;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getDisplayName(user: SupabaseAuthUser): string {
  const rawFullName = user.user_metadata?.full_name;

  if (typeof rawFullName === "string" && rawFullName.trim()) {
    return rawFullName.trim();
  }

  if (!user.email) {
    return "Argos Team";
  }

  return user.email.split("@")[0] || "Argos Team";
}

function getNameParts(user: SupabaseAuthUser) {
  const firstName =
    typeof user.user_metadata?.first_name === "string" && user.user_metadata.first_name.trim()
      ? user.user_metadata.first_name.trim()
      : null;
  const lastName =
    typeof user.user_metadata?.last_name === "string" && user.user_metadata.last_name.trim()
      ? user.user_metadata.last_name.trim()
      : null;

  return { firstName, lastName };
}

export async function ensureUserProvisioned(
  repository: ProvisioningRepository,
  user: SupabaseAuthUser,
) {
  if (!user.email) {
    throw new Error("Supabase user is missing an email address");
  }

  const existingUser = await repository.findUserById(user.id);

  if (existingUser?.orgId) {
    return {
      userId: existingUser.id,
      orgId: existingUser.orgId,
      created: false,
    };
  }

  const displayName = getDisplayName(user);
  const { firstName, lastName } = getNameParts(user);
  const organization = await repository.createOrganization({
    name: `${displayName}'s Team`,
    slug: `${slugify(displayName)}-${user.id.slice(0, 8)}`,
    plan: "trial",
  });

  await repository.createUser({
    id: user.id,
    orgId: organization.id,
    email: user.email,
    role: "admin",
    firstName,
    lastName,
    displayNameSet: Boolean(firstName || lastName),
  });

  return {
    userId: user.id,
    orgId: organization.id,
    created: true,
  };
}
