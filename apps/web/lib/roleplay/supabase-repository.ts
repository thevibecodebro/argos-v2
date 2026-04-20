import { findUserWithOrgByAuthId, getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import type {
  RoleplayRepository,
  RoleplayScorecard,
  RoleplaySessionCreateInput,
  RoleplaySessionRecord,
} from "./service";
import { normalizeRoleplaySessionCreateInput } from "./service";

function normalizeSessionRecord(record: any): RoleplaySessionRecord {
  return {
    id: record.id,
    repId: record.rep_id,
    orgId: record.org_id,
    persona: record.persona,
    industry: record.industry,
    difficulty: record.difficulty,
    overallScore: record.overall_score,
    origin: record.origin ?? "manual",
    sourceCallId: record.source_call_id ?? null,
    rubricId: record.rubric_id ?? null,
    focusMode: record.focus_mode ?? "all",
    focusCategorySlug: record.focus_category_slug ?? null,
    scenarioSummary: record.scenario_summary ?? null,
    scenarioBrief: record.scenario_brief ?? null,
    transcript: Array.isArray(record.transcript) ? record.transcript : null,
    scorecard: record.scorecard && typeof record.scorecard === "object" ? record.scorecard : null,
    status: record.status,
    createdAt: toDate(record.created_at) ?? new Date(0),
  };
}

export class SupabaseRoleplayRepository implements RoleplayRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  async createSession(input: RoleplaySessionCreateInput) {
    const supabase: any = this.supabase;
    const sessionInput = normalizeRoleplaySessionCreateInput(input);
    const { data, error } = await supabase
      .from("roleplay_sessions")
      .insert({
        difficulty: sessionInput.difficulty,
        industry: sessionInput.industry,
        org_id: sessionInput.orgId,
        origin: sessionInput.origin,
        source_call_id: sessionInput.sourceCallId,
        persona: sessionInput.persona,
        rubric_id: sessionInput.rubricId,
        focus_mode: sessionInput.focusMode,
        focus_category_slug: sessionInput.focusCategorySlug,
        scenario_brief: sessionInput.scenarioBrief,
        scenario_summary: sessionInput.scenarioSummary,
        rep_id: sessionInput.repId,
        scorecard: sessionInput.scorecard,
        status: sessionInput.status,
        transcript: sessionInput.transcript,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return normalizeSessionRecord(data);
  }

  async findCurrentUserByAuthId(authUserId: string) {
    const user = await findUserWithOrgByAuthId(authUserId, this.supabase);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      org: user.org
        ? {
            id: user.org.id,
            name: user.org.name,
            slug: user.org.slug,
            plan: user.org.plan,
          }
        : null,
    };
  }

  async findSessionById(sessionId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("roleplay_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? normalizeSessionRecord(data) : null;
  }

  async findSessionsByOrgId(orgId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("roleplay_sessions")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(normalizeSessionRecord);
  }

  async findSessionsByRepId(repId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("roleplay_sessions")
      .select("*")
      .eq("rep_id", repId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(normalizeSessionRecord);
  }

  async updateSession(
    sessionId: string,
    patch: Partial<{
      overallScore: number | null;
      scorecard: RoleplayScorecard | null;
      status: "active" | "evaluating" | "complete";
      transcript: Array<{ role: "assistant" | "user"; content: string }>;
    }>,
  ) {
    const supabase: any = this.supabase;
    const updatePatch: Record<string, unknown> = {};

    if (patch.overallScore !== undefined) updatePatch.overall_score = patch.overallScore;
    if (patch.scorecard !== undefined) updatePatch.scorecard = patch.scorecard;
    if (patch.status !== undefined) updatePatch.status = patch.status;
    if (patch.transcript !== undefined) updatePatch.transcript = patch.transcript;

    const { data, error } = await supabase
      .from("roleplay_sessions")
      .update(updatePatch)
      .eq("id", sessionId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return normalizeSessionRecord(data);
  }
}
