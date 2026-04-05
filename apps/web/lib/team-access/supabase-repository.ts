import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TeamPermissionKey } from "@/lib/access/permissions";
import type {
  TeamAccessManager,
  TeamAccessRep,
  TeamAccessRepository,
  TeamAccessSnapshot,
  TeamAccessTeam,
  TeamAccessViewer,
} from "./service";

type SupabaseRow = Record<string, any>;

function buildFullName(firstName: string | null, lastName: string | null, email: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || email;
}

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function toSupabaseInList(values: string[]) {
  return `(${values.map((value) => JSON.stringify(value)).join(",")})`;
}

export class SupabaseTeamAccessRepository implements TeamAccessRepository {
  constructor(private readonly supabase = createSupabaseAdminClient()) {}

  async findCurrentUserByAuthId(authUserId: string) {
    const supabase: any = this.supabase;
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, role, org_id")
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
      const { data: orgRow, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug, plan")
        .eq("id", user.org_id)
        .maybeSingle();

      if (orgError) {
        throw new Error(orgError.message);
      }

      org = orgRow
        ? {
            id: orgRow.id,
            name: orgRow.name,
            slug: orgRow.slug,
            plan: orgRow.plan,
          }
        : null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      org,
    } satisfies TeamAccessViewer & {
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  }

  async findOrganizationUserRole(orgId: string, userId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("org_id", orgId)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.role ?? null;
  }

  async createTeam(input: { orgId: string; name: string; description: string | null }) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("teams")
      .insert({
        org_id: input.orgId,
        name: input.name,
        description: input.description,
      })
      .select("id, org_id, name, description, status, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      orgId: data.org_id,
      name: data.name,
      description: data.description,
      status: data.status,
      createdAt: toDate(data.created_at) ?? new Date(0),
      updatedAt: toDate(data.updated_at) ?? new Date(0),
    };
  }

  async upsertPrimaryManagerAssignment(orgId: string, repId: string, managerId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("rep_manager_assignments")
      .upsert(
        {
          org_id: orgId,
          rep_id: repId,
          manager_id: managerId,
        },
        { onConflict: "rep_id" },
      )
      .select("rep_id, manager_id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      repId: data.rep_id,
      managerId: data.manager_id,
    };
  }

  async replaceManagerTeamPermissionGrants(input: {
    orgId: string;
    teamId: string;
    managerId: string;
    permissionKeys: TeamPermissionKey[];
    grantedBy: string;
  }) {
    const supabase: any = this.supabase;
    const permissionKeys = Array.from(new Set(input.permissionKeys));

    if (!permissionKeys.length) {
      const { error: deleteError } = await supabase
        .from("team_permission_grants")
        .delete()
        .eq("org_id", input.orgId)
        .eq("team_id", input.teamId)
        .eq("user_id", input.managerId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      return [];
    }

    const { error: upsertError } = await supabase
      .from("team_permission_grants")
      .upsert(
        permissionKeys.map((permissionKey) => ({
          org_id: input.orgId,
          team_id: input.teamId,
          user_id: input.managerId,
          permission_key: permissionKey,
          granted_by: input.grantedBy,
        })),
        {
          onConflict: "team_id,user_id,permission_key",
        },
      )
      .select("permission_key");

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const { error: deleteError } = await supabase
      .from("team_permission_grants")
      .delete()
      .eq("org_id", input.orgId)
      .eq("team_id", input.teamId)
      .eq("user_id", input.managerId)
      .not("permission_key", "in", toSupabaseInList(permissionKeys));

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return permissionKeys;
  }

  async findTeamAccessSnapshot(orgId: string): Promise<TeamAccessSnapshot> {
    const supabase: any = this.supabase;
    const [
      { data: teams, error: teamsError },
      { data: managers, error: managersError },
      { data: reps, error: repsError },
      { data: assignments, error: assignmentsError },
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name, description, status")
        .eq("org_id", orgId)
        .order("name", { ascending: true }),
      supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("org_id", orgId)
        .eq("role", "manager")
        .order("first_name", { ascending: true }),
      supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("org_id", orgId)
        .eq("role", "rep")
        .order("first_name", { ascending: true }),
      supabase
        .from("rep_manager_assignments")
        .select("rep_id, manager_id")
        .eq("org_id", orgId),
    ]);

    if (teamsError) {
      throw new Error(teamsError.message);
    }
    if (managersError) {
      throw new Error(managersError.message);
    }
    if (repsError) {
      throw new Error(repsError.message);
    }
    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    const primaryManagerByRepId = new Map<string, string>();
    for (const row of assignments ?? []) {
      primaryManagerByRepId.set((row as SupabaseRow).rep_id, (row as SupabaseRow).manager_id);
    }

    return {
      teams: (teams ?? []).map(
        (row: SupabaseRow): TeamAccessTeam => ({
          id: row.id,
          name: row.name,
          description: row.description,
          status: row.status,
        }),
      ),
      managers: (managers ?? []).map(
        (row: SupabaseRow): TeamAccessManager => ({
          id: row.id,
          name: buildFullName(row.first_name, row.last_name, row.email),
        }),
      ),
      reps: (reps ?? []).map(
        (row: SupabaseRow): TeamAccessRep => ({
          id: row.id,
          name: buildFullName(row.first_name, row.last_name, row.email),
          primaryManagerId: primaryManagerByRepId.get(row.id) ?? null,
        }),
      ),
    };
  }
}
