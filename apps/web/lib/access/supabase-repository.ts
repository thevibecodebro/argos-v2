import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AccessRepository } from "./repository.types";

type SupabaseRow = Record<string, any>;

export class SupabaseAccessRepository implements AccessRepository {
  constructor(private readonly supabase = createSupabaseAdminClient()) {}

  async findActorByAuthUserId(authUserId: string) {
    const supabase: any = this.supabase;
    const { data: user, error } = await supabase
      .from("users")
      .select("id, org_id, role")
      .eq("id", authUserId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      orgId: user.org_id,
      role: user.role,
    };
  }

  async findMembershipsByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("team_memberships")
      .select("org_id, team_id, user_id, membership_type")
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: SupabaseRow) => ({
      orgId: row.org_id,
      teamId: row.team_id,
      userId: row.user_id,
      membershipType: row.membership_type,
    }));
  }

  async findGrantsByUserId(userId: string, orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("team_permission_grants")
      .select("org_id, team_id, user_id, permission_key")
      .eq("user_id", userId)
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: SupabaseRow) => ({
      orgId: row.org_id,
      teamId: row.team_id,
      userId: row.user_id,
      permissionKey: row.permission_key,
    }));
  }
}
