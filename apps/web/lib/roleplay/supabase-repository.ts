import { findUserWithOrgByAuthId, getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import type {
  RoleplayRepository,
  RoleplayScorecard,
  RoleplaySessionRecord,
} from "./service";

function normalizeSessionRecord(record: any): RoleplaySessionRecord {
  return {
    id: record.id,
    repId: record.rep_id,
    orgId: record.org_id,
    persona: record.persona,
    industry: record.industry,
    difficulty: record.difficulty,
    overallScore: record.overall_score,
    transcript: Array.isArray(record.transcript) ? record.transcript : null,
    scorecard: record.scorecard && typeof record.scorecard === "object" ? record.scorecard : null,
    status: record.status,
    createdAt: toDate(record.created_at) ?? new Date(0),
  };
}

export class SupabaseRoleplayRepository implements RoleplayRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  async createSession(input: {
    difficulty: "beginner" | "intermediate" | "advanced";
    industry: string;
    orgId: string;
    persona: string;
    repId: string;
    scorecard: RoleplayScorecard | null;
    status: "active" | "evaluating" | "complete";
    transcript: Array<{ role: "assistant" | "user"; content: string }>;
  }) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("roleplay_sessions")
      .insert({
        difficulty: input.difficulty,
        industry: input.industry,
        org_id: input.orgId,
        persona: input.persona,
        rep_id: input.repId,
        scorecard: input.scorecard,
        status: input.status,
        transcript: input.transcript,
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
