import { findUserWithOrgByAuthId, getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import { parseAppUserRole } from "./roles";
import type { AppUserRole } from "./roles";
import type { UsersRepository } from "./service";

export class SupabaseUsersRepository implements UsersRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  async findCurrentUserByAuthId(authUserId: string) {
    const user = await findUserWithOrgByAuthId(authUserId, this.supabase);

    if (!user) {
      return null;
    }

    return user;
  }

  async findOrganizationMember(userId: string, orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("users")
      .select("id, org_id, role")
      .eq("id", userId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data
      ? {
          id: data.id,
          orgId: data.org_id,
          role: parseAppUserRole(data.role),
        }
      : null;
  }

  async findOrganizationMembers(orgId: string) {
    const supabase: any = this.supabase;
    const [{ data: members, error: memberError }, { data: calls, error: callsError }] = await Promise.all([
      supabase
        .from("users")
        .select("id, email, first_name, last_name, profile_image_url, role, created_at")
        .eq("org_id", orgId),
      supabase.from("calls").select("id, rep_id").eq("org_id", orgId),
    ]);

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (callsError) {
      throw new Error(callsError.message);
    }

    const callCountByRepId = new Map<string, number>();
    for (const call of calls ?? []) {
      callCountByRepId.set(call.rep_id, (callCountByRepId.get(call.rep_id) ?? 0) + 1);
    }

    return (members ?? []).map((member: any) => ({
      id: member.id,
      email: member.email,
      firstName: member.first_name,
      lastName: member.last_name,
      profileImageUrl: member.profile_image_url,
      role: parseAppUserRole(member.role),
      callCount: callCountByRepId.get(member.id) ?? 0,
      joinedAt: toDate(member.created_at) ?? new Date(0),
    }));
  }

  async removeOrganizationMember(userId: string, orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("users")
      .update({
        org_id: null,
        role: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .eq("org_id", orgId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.id);
  }

  async updateCurrentUserProfile(
    userId: string,
    patch: { displayNameSet: boolean; firstName: string | null; lastName: string | null },
  ) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("users")
      .update({
        first_name: patch.firstName,
        last_name: patch.lastName,
        display_name_set: patch.displayNameSet,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.id) {
      return null;
    }

    return this.findCurrentUserByAuthId(data.id);
  }

  async updateOrganizationMemberRole(userId: string, orgId: string, role: AppUserRole) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("users")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .eq("org_id", orgId)
      .select("id, role")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data
      ? {
          id: data.id,
          role: parseAppUserRole(data.role) ?? role,
        }
      : null;
  }
}
