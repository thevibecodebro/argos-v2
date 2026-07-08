import {
  findUserWithOrgByAuthId,
  getSupabaseAdminClient,
  toDate,
} from "@/lib/supabase/admin-repository-helpers";
import {
  coerceStoredWorkspaceTheme,
  type WorkspaceTheme,
} from "@/lib/organizations/workspace-theme";
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
    const [
      { data: members, error: memberError },
      { data: calls, error: callsError },
    ] = await Promise.all([
      supabase
        .from("users")
        .select(
          "id, email, first_name, last_name, profile_image_url, role, created_at",
        )
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
      callCountByRepId.set(
        call.rep_id,
        (callCountByRepId.get(call.rep_id) ?? 0) + 1,
      );
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

  async deprovisionOrganizationMember(input: {
    actorId: string;
    orgId: string;
    reason: string;
    targetUserId: string;
    ticketId: string | null;
  }) {
    const supabase: any = this.supabase;
    const { data: member, error: memberError } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("id", input.targetUserId)
      .eq("org_id", input.orgId)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!member?.id) {
      return false;
    }

    await this.deleteSupabaseRows(
      "team_permission_grants",
      input.orgId,
      "user_id",
      input.targetUserId,
    );
    await this.deleteSupabaseRows(
      "team_permission_grants",
      input.orgId,
      "granted_by",
      input.targetUserId,
    );
    await this.deleteSupabaseRows(
      "rep_manager_assignments",
      input.orgId,
      "rep_id",
      input.targetUserId,
    );
    await this.deleteSupabaseRows(
      "rep_manager_assignments",
      input.orgId,
      "manager_id",
      input.targetUserId,
    );
    await this.deleteSupabaseRows(
      "team_memberships",
      input.orgId,
      "user_id",
      input.targetUserId,
    );
    await this.deleteSupabaseRows(
      "ghl_user_mappings",
      input.orgId,
      "argos_user_id",
      input.targetUserId,
    );

    const { error: inviteError } = await supabase
      .from("invites")
      .delete()
      .eq("org_id", input.orgId)
      .eq("email", member.email);

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({
        org_id: null,
        role: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.targetUserId)
      .eq("org_id", input.orgId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updated?.id) {
      return false;
    }

    const { error: auditError } = await supabase.from("audit_events").insert({
      org_id: input.orgId,
      actor_id: input.actorId,
      event_type: "member_removed",
      resource_type: "user",
      resource_id: input.targetUserId,
      metadata: {
        reason: input.reason,
        ticketId: input.ticketId,
        removedUserEmail: member.email,
        removedUserRole: member.role,
      },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    return true;
  }

  private async deleteSupabaseRows(
    table: string,
    orgId: string,
    column: string,
    value: string,
  ) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("org_id", orgId)
      .eq(column, value);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateCurrentUserProfile(
    userId: string,
    patch: {
      displayNameSet: boolean;
      firstName: string | null;
      lastName: string | null;
    },
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

  async updateOrganizationLogo(orgId: string, logoUrl: string | null) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("organizations")
      .update({
        logo_url: logoUrl,
      })
      .eq("id", orgId)
      .select("id, name, slug, plan, logo_url, workspace_theme, created_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data
      ? {
          id: data.id,
          name: data.name,
          slug: data.slug,
          plan: data.plan,
          logoUrl: data.logo_url,
          workspaceTheme: coerceStoredWorkspaceTheme(data.workspace_theme),
          createdAt: toDate(data.created_at) ?? new Date(0),
        }
      : null;
  }

  async updateOrganizationWorkspaceTheme(
    orgId: string,
    workspaceTheme: WorkspaceTheme | null,
  ) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("organizations")
      .update({
        workspace_theme: workspaceTheme,
      })
      .eq("id", orgId)
      .select("id, name, slug, plan, logo_url, workspace_theme, created_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data
      ? {
          id: data.id,
          name: data.name,
          slug: data.slug,
          plan: data.plan,
          logoUrl: data.logo_url,
          workspaceTheme: coerceStoredWorkspaceTheme(data.workspace_theme),
          createdAt: toDate(data.created_at) ?? new Date(0),
        }
      : null;
  }

  async updateOrganizationMemberRole(
    userId: string,
    orgId: string,
    role: AppUserRole,
  ) {
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
