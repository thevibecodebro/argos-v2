import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseAppUserRole } from "@/lib/users/roles";
import type { DashboardRepository } from "./service";

type SupabaseLike = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export class SupabaseDashboardRepository implements DashboardRepository {
  constructor(
    private readonly supabasePromise = createSupabaseServerClient(),
  ) {}

  private async getSupabase(): Promise<SupabaseLike> {
    return this.supabasePromise;
  }

  async findCurrentUserByAuthId(authUserId: string) {
    const supabase = await this.getSupabase();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, role, first_name, last_name, org_id")
      .eq("id", authUserId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const dashboardUser = user as any;

    if (!dashboardUser) {
      return null;
    }

    let org = null;

    if (dashboardUser.org_id) {
      const { data: orgRow, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug, plan")
        .eq("id", dashboardUser.org_id)
        .maybeSingle();

      if (orgError) {
        throw new Error(orgError.message);
      }

      org = orgRow;
    }

    return {
      id: dashboardUser.id,
      email: dashboardUser.email,
      role: parseAppUserRole(dashboardUser.role),
      firstName: dashboardUser.first_name,
      lastName: dashboardUser.last_name,
      org,
    };
  }

  async findRecentCallsByRepId(repId: string, limit: number) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("calls")
      .select("id, rep_id, call_topic, created_at, overall_score, status, duration_seconds")
      .eq("rep_id", repId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((call: any) => ({
      id: call.id,
      repId: call.rep_id,
      callTopic: call.call_topic,
      createdAt: new Date(call.created_at),
      overallScore: call.overall_score,
      status: call.status,
      durationSeconds: call.duration_seconds,
      repFirstName: null,
      repLastName: null,
    }));
  }

  async findScoredCallsByRepIdSince(repId: string, since: Date) {
    return this.findCompletedCallsQuery({ repId, since });
  }

  async findCompletedCallsByRepId(repId: string) {
    return this.findCompletedCallsQuery({ repId });
  }

  async findCompletedCallsByOrgId(orgId: string) {
    return this.findCompletedCallsQuery({ orgId });
  }

  async findOrgUsersByOrgId(orgId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, first_name, last_name, profile_image_url")
      .eq("org_id", orgId);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((user: any) => ({
      id: user.id,
      email: user.email,
      role: parseAppUserRole(user.role),
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.profile_image_url,
    }));
  }

  async findTrainingProgressByOrgId(orgId: string) {
    const repIds = (await this.findOrgUsersByOrgId(orgId)).map((user) => user.id);

    if (!repIds.length) {
      return [];
    }

    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("training_progress")
      .select("rep_id, status")
      .in("rep_id", repIds);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: any) => ({
      repId: row.rep_id,
      status: row.status,
    }));
  }

  async findPassedTrainingByRepId(repId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("training_progress")
      .select("completed_at")
      .eq("rep_id", repId)
      .eq("status", "passed")
      .order("completed_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row: any) => row.completed_at)
      .filter(Boolean)
      .map((value: string) => new Date(value));
  }

  async findCompletedRoleplaysByRepId(repId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("roleplay_sessions")
      .select("created_at")
      .eq("rep_id", repId)
      .eq("status", "complete")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row: any) => row.created_at)
      .filter(Boolean)
      .map((value: string) => new Date(value));
  }

  async findCallCountByOrgIdSince(orgId: string, since: Date) {
    const supabase = await this.getSupabase();
    const { count, error } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", since.toISOString());

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }

  async findCompletedRoleplayCountByOrgId(orgId: string) {
    const supabase = await this.getSupabase();
    const { count, error } = await supabase
      .from("roleplay_sessions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "complete");

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }

  private async findCompletedCallsQuery({
    orgId,
    repId,
    since,
  }: {
    orgId?: string;
    repId?: string;
    since?: Date;
  }) {
    const supabase = await this.getSupabase();
    let query = supabase
      .from("calls")
      .select(`
        id,
        rep_id,
        call_topic,
        created_at,
        overall_score,
        duration_seconds,
        frame_control_score,
        rapport_score,
        discovery_score,
        pain_expansion_score,
        solution_score,
        objection_score,
        closing_score
      `)
      .eq("status", "complete")
      .order("created_at", { ascending: true });

    if (orgId) {
      query = query.eq("org_id", orgId);
    }

    if (repId) {
      query = query.eq("rep_id", repId);
    }

    if (since) {
      query = query.gte("created_at", since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((call: any) => ({
      id: call.id,
      repId: call.rep_id,
      callTopic: call.call_topic,
      createdAt: new Date(call.created_at),
      overallScore: call.overall_score,
      durationSeconds: call.duration_seconds,
      frameControlScore: call.frame_control_score,
      rapportScore: call.rapport_score,
      discoveryScore: call.discovery_score,
      painExpansionScore: call.pain_expansion_score,
      solutionScore: call.solution_score,
      objectionScore: call.objection_score,
      closingScore: call.closing_score,
    }));
  }
}
