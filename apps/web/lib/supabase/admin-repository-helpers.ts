import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAppUserRole } from "@/lib/users/roles";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type UserOrgRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: ReturnType<typeof parseAppUserRole>;
  orgId: string | null;
  displayNameSet: boolean;
  createdAt: Date;
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: Date;
  } | null;
};

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export function getSupabaseAdminClient(client?: SupabaseAdminClient) {
  return client ?? createSupabaseAdminClient();
}

export async function findUserWithOrgByAuthId(
  authUserId: string,
  client?: SupabaseAdminClient,
): Promise<UserOrgRecord | null> {
  const supabase: any = getSupabaseAdminClient(client);
  const { data: user, error } = await supabase
    .from("users")
    .select(
      "id, email, first_name, last_name, profile_image_url, role, org_id, display_name_set, created_at",
    )
    .eq("id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    return null;
  }

  let org = null;

  if (user.org_id) {
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, plan, created_at")
      .eq("id", user.org_id)
      .maybeSingle();

    if (orgError) {
      throw new Error(orgError.message);
    }

    org = orgData
      ? {
          id: orgData.id,
          name: orgData.name,
          slug: orgData.slug,
          plan: orgData.plan,
          createdAt: toDate(orgData.created_at) ?? new Date(0),
        }
      : null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    profileImageUrl: user.profile_image_url,
    role: parseAppUserRole(user.role),
    orgId: user.org_id,
    displayNameSet: Boolean(user.display_name_set),
    createdAt: toDate(user.created_at) ?? new Date(0),
    org,
  };
}

export async function findUsersByIds(
  userIds: string[],
  client?: SupabaseAdminClient,
): Promise<
  Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    role: ReturnType<typeof parseAppUserRole>;
    createdAt: Date;
  }>
> {
  if (!userIds.length) {
    return [];
  }

  const supabase: any = getSupabaseAdminClient(client);
  const { data, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, profile_image_url, role, created_at")
    .in("id", Array.from(new Set(userIds)));

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url,
    role: parseAppUserRole(row.role),
    createdAt: toDate(row.created_at) ?? new Date(0),
  }));
}

export { toDate };
