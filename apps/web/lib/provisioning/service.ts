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
  createUser(input: {
    id: string;
    orgId: string | null;
    email: string;
    role: AppUserRole | null;
    firstName: string | null;
    lastName: string | null;
    displayNameSet: boolean;
  }): Promise<void>;
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

  if (existingUser) {
    return {
      userId: existingUser.id,
      orgId: null,
      created: false,
    };
  }

  const { firstName, lastName } = getNameParts(user);

  await repository.createUser({
    id: user.id,
    orgId: null,
    email: user.email,
    role: null,
    firstName,
    lastName,
    displayNameSet: Boolean(firstName || lastName),
  });

  return {
    userId: user.id,
    orgId: null,
    created: true,
  };
}
