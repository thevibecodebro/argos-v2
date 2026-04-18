import { findUserWithOrgByAuthId, findUsersByIds, getSupabaseAdminClient, toDate } from "@/lib/supabase/admin-repository-helpers";
import type { CallsFilters, CallsRepository } from "./service";
import type { CallEvaluation } from "./types";

type SupabaseCallRow = {
  id: string;
  org_id: string;
  rep_id: string;
  recording_url: string | null;
  transcript_url: string | null;
  duration_seconds: number | null;
  status: string;
  overall_score: number | null;
  frame_control_score: number | null;
  rapport_score: number | null;
  discovery_score: number | null;
  pain_expansion_score: number | null;
  solution_score: number | null;
  objection_score: number | null;
  closing_score: number | null;
  confidence: string | null;
  call_stage_reached: string | null;
  strengths: unknown;
  improvements: unknown;
  recommended_drills: unknown;
  call_topic: string | null;
  transcript: unknown;
  created_at: string;
};

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? (value as string[]) : null;
}

function normalizeTranscript(value: unknown) {
  return Array.isArray(value) ? value : null;
}

export class SupabaseCallsRepository implements CallsRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  async createCall(input: {
    orgId: string;
    repId: string;
    callTopic: string | null;
    durationSeconds: number | null;
    recordingUrl: string | null;
    transcriptUrl: string | null;
    consentConfirmed: boolean;
    status: "uploaded" | "transcribing" | "evaluating" | "complete" | "failed";
  }) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("calls")
      .insert({
        org_id: input.orgId,
        rep_id: input.repId,
        call_topic: input.callTopic,
        duration_seconds: input.durationSeconds,
        recording_url: input.recordingUrl,
        transcript_url: input.transcriptUrl,
        consent_confirmed: input.consentConfirmed,
        status: input.status,
      })
      .select("id, status, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      status: data.status,
      createdAt: toDate(data.created_at) ?? new Date(),
    };
  }

  async createNotification(input: {
    body: string;
    link: string | null;
    title: string;
    type: "call_scored" | "annotation_added" | "module_assigned";
    userId: string;
  }) {
    const supabase: any = this.supabase;
    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteCall(callId: string) {
    const supabase: any = this.supabase;
    const { error } = await supabase.from("calls").delete().eq("id", callId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async createOrResetCallProcessingJob(input: {
    callId: string;
    sourceOrigin: "manual_upload" | "zoom_recording";
    sourceStoragePath: string;
    sourceFileName: string;
    sourceContentType: string | null;
    sourceSizeBytes: number | null;
  }) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("call_processing_jobs")
      .upsert(
        {
          call_id: input.callId,
          source_origin: input.sourceOrigin,
          source_storage_path: input.sourceStoragePath,
          source_file_name: input.sourceFileName,
          source_content_type: input.sourceContentType,
          source_size_bytes: input.sourceSizeBytes,
          status: "pending",
          attempt_count: 0,
          next_run_at: new Date().toISOString(),
          locked_at: null,
          lock_expires_at: null,
          last_stage: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "call_id" },
      );

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteAnnotation(annotationId: string, callId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("call_annotations")
      .delete()
      .eq("id", annotationId)
      .eq("call_id", callId)
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.length);
  }

  async findAnnotations(callId: string) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("call_annotations")
      .select("id, call_id, author_id, timestamp_seconds, note, created_at")
      .eq("call_id", callId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const authorMap = new Map(
      (
        await findUsersByIds(
          (data ?? []).map((row: any) => row.author_id).filter(Boolean),
          this.supabase,
        )
      ).map((user) => [user.id, user]),
    );

    return (data ?? []).map((row: any) => {
      const author = authorMap.get(row.author_id);
      return {
        id: row.id,
        callId: row.call_id,
        authorId: row.author_id,
        timestampSeconds: row.timestamp_seconds,
        note: row.note,
        createdAt: toDate(row.created_at) ?? new Date(0),
        authorFirstName: author?.firstName ?? null,
        authorLastName: author?.lastName ?? null,
        authorRole: author?.role ?? null,
      };
    });
  }

  async findCallById(callId: string) {
    const supabase: any = this.supabase;
    const { data: call, error } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!call) {
      return null;
    }

    const [{ data: moments, error: momentsError }, repUsers] = await Promise.all([
      supabase
        .from("call_moments")
        .select("id, call_id, timestamp_seconds, category, observation, recommendation, severity, is_highlight, highlight_note, created_at")
        .eq("call_id", callId)
        .order("timestamp_seconds", { ascending: true })
        .order("created_at", { ascending: true }),
      findUsersByIds([call.rep_id], this.supabase),
    ]);

    if (momentsError) {
      throw new Error(momentsError.message);
    }

    const rep = repUsers[0] ?? null;

    return {
      id: call.id,
      status: call.status,
      recordingUrl: call.recording_url,
      transcriptUrl: call.transcript_url,
      durationSeconds: call.duration_seconds,
      callTopic: call.call_topic,
      overallScore: call.overall_score,
      frameControlScore: call.frame_control_score,
      rapportScore: call.rapport_score,
      discoveryScore: call.discovery_score,
      painExpansionScore: call.pain_expansion_score,
      solutionScore: call.solution_score,
      objectionScore: call.objection_score,
      closingScore: call.closing_score,
      confidence: call.confidence,
      callStageReached: call.call_stage_reached,
      strengths: normalizeStringArray(call.strengths),
      improvements: normalizeStringArray(call.improvements),
      recommendedDrills: normalizeStringArray(call.recommended_drills),
      transcript: normalizeTranscript(call.transcript),
      repId: call.rep_id,
      orgId: call.org_id,
      createdAt: toDate(call.created_at) ?? new Date(0),
      repFirstName: rep?.firstName ?? null,
      repLastName: rep?.lastName ?? null,
      moments: (moments ?? []).map((row: any) => ({
        id: row.id,
        callId: row.call_id,
        timestampSeconds: row.timestamp_seconds,
        category: row.category,
        observation: row.observation,
        recommendation: row.recommendation,
        severity: row.severity,
        isHighlight: Boolean(row.is_highlight),
        highlightNote: row.highlight_note,
        createdAt: toDate(row.created_at) ?? new Date(0),
      })),
    };
  }

  async findCallsByOrgId(orgId: string, filters: CallsFilters) {
    return this.listCalls({ orgId, filters });
  }

  async findCallsByRepId(repId: string, filters: CallsFilters) {
    return this.listCalls({ repId, filters });
  }

  async findCallsByRepIds(repIds: string[], filters: CallsFilters) {
    if (!repIds.length) {
      return { calls: [], total: 0 };
    }
    return this.listCalls({ repIds, filters });
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

  async findHighlightsByOrgId(orgId: string) {
    return this.listHighlights({ orgId });
  }

  async findHighlightsByRepId(repId: string) {
    return this.listHighlights({ repId });
  }

  async findScoreTrend(repId: string, since: Date) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("calls")
      .select("id, call_topic, created_at, overall_score, frame_control_score, rapport_score, discovery_score, pain_expansion_score, solution_score, objection_score, closing_score")
      .eq("rep_id", repId)
      .eq("status", "complete")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row: any) => ({
      callId: row.id,
      callTopic: row.call_topic,
      createdAt: toDate(row.created_at) ?? new Date(0),
      overallScore: row.overall_score,
      frameControl: row.frame_control_score,
      rapport: row.rapport_score,
      discovery: row.discovery_score,
      painExpansion: row.pain_expansion_score,
      solution: row.solution_score,
      objection: row.objection_score,
      closing: row.closing_score,
    }));
  }

  async insertAnnotation(input: {
    authorId: string;
    callId: string;
    note: string;
    timestampSeconds: number | null;
  }) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("call_annotations")
      .insert({
        author_id: input.authorId,
        call_id: input.callId,
        note: input.note,
        timestamp_seconds: input.timestampSeconds,
      })
      .select("id, call_id, author_id, timestamp_seconds, note, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const [author] = await findUsersByIds([input.authorId], this.supabase);

    return {
      id: data.id,
      callId: data.call_id,
      authorId: data.author_id,
      timestampSeconds: data.timestamp_seconds,
      note: data.note,
      createdAt: toDate(data.created_at) ?? new Date(),
      authorFirstName: author?.firstName ?? null,
      authorLastName: author?.lastName ?? null,
      authorRole: author?.role ?? null,
    };
  }

  async setCallEvaluation(callId: string, evaluation: CallEvaluation) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("calls")
      .update({
        status: "complete",
        duration_seconds: evaluation.durationSeconds,
        overall_score: evaluation.overallScore,
        frame_control_score: evaluation.frameControlScore,
        rapport_score: evaluation.rapportScore,
        discovery_score: evaluation.discoveryScore,
        pain_expansion_score: evaluation.painExpansionScore,
        solution_score: evaluation.solutionScore,
        objection_score: evaluation.objectionScore,
        closing_score: evaluation.closingScore,
        confidence: evaluation.confidence,
        call_stage_reached: evaluation.callStageReached,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        recommended_drills: evaluation.recommendedDrills,
        transcript: evaluation.transcript,
      })
      .eq("id", callId);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase.from("call_moments").delete().eq("call_id", callId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (evaluation.moments?.length) {
      const { error: insertError } = await supabase.from("call_moments").insert(
        evaluation.moments.map((moment: any) => ({
          call_id: callId,
          timestamp_seconds: moment.timestampSeconds,
          category: moment.category,
          observation: moment.observation,
          recommendation: moment.recommendation,
          severity: moment.severity,
          is_highlight: moment.isHighlight,
          highlight_note: moment.highlightNote,
        })),
      );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }

  async updateCallRecording(callId: string, recordingUrl: string | null) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("calls")
      .update({ recording_url: recordingUrl })
      .eq("id", callId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateCallStatus(
    callId: string,
    status: "uploaded" | "transcribing" | "evaluating" | "complete" | "failed",
  ) {
    const supabase: any = this.supabase;
    const { error } = await supabase
      .from("calls")
      .update({ status })
      .eq("id", callId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateCallTopic(callId: string, callTopic: string | null) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("calls")
      .update({ call_topic: callTopic })
      .eq("id", callId)
      .select("id, call_topic")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      callTopic: data.call_topic,
    };
  }

  async updateMomentHighlight(
    callId: string,
    momentId: string,
    isHighlight: boolean,
    highlightNote: string | null,
  ) {
    const supabase: any = this.supabase;
    const { data, error } = await supabase
      .from("call_moments")
      .update({
        is_highlight: isHighlight,
        highlight_note: highlightNote,
      })
      .eq("id", momentId)
      .eq("call_id", callId)
      .select("id, call_id, timestamp_seconds, category, observation, recommendation, severity, is_highlight, highlight_note, created_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data
      ? {
          id: data.id,
          callId: data.call_id,
          timestampSeconds: data.timestamp_seconds,
          category: data.category,
          observation: data.observation,
          recommendation: data.recommendation,
          severity: data.severity,
          isHighlight: Boolean(data.is_highlight),
          highlightNote: data.highlight_note,
          createdAt: toDate(data.created_at) ?? new Date(0),
        }
      : null;
  }

  private async listCalls({
    orgId,
    repId,
    repIds,
    filters,
  }: {
    orgId?: string;
    repId?: string;
    repIds?: string[];
    filters: CallsFilters;
  }) {
    const supabase: any = this.supabase;
    let dataQuery = supabase
      .from("calls")
      .select(
        "id, org_id, rep_id, recording_url, transcript_url, duration_seconds, status, overall_score, frame_control_score, rapport_score, discovery_score, pain_expansion_score, solution_score, objection_score, closing_score, confidence, call_stage_reached, strengths, improvements, recommended_drills, call_topic, transcript, created_at",
        { count: "exact" },
      );

    let countQuery = supabase.from("calls").select("id", { count: "exact", head: true });

    const applyFilters = (query: any) => {
      if (orgId) query = query.eq("org_id", orgId);
      if (repId) query = query.eq("rep_id", repId);
      if (repIds) query = query.in("rep_id", repIds);
      if (filters.status && filters.status !== "all") {
        const normalizedStatus = filters.status === "processing" ? "evaluating" : filters.status;
        query = query.eq("status", normalizedStatus);
      }
      if (filters.search) query = query.ilike("call_topic", `%${filters.search}%`);
      if (filters.minScore !== undefined) query = query.gte("overall_score", filters.minScore);
      if (filters.maxScore !== undefined) query = query.lte("overall_score", filters.maxScore);
      return query;
    };

    dataQuery = applyFilters(dataQuery);
    countQuery = applyFilters(countQuery);

    const sortColumn = filters.sortBy === "overallScore" ? "overall_score" : "created_at";
    const ascending = filters.sortOrder === "asc";
    dataQuery = dataQuery.order(sortColumn, { ascending });

    if (filters.limit !== undefined && filters.offset !== undefined) {
      dataQuery = dataQuery.range(filters.offset, filters.offset + filters.limit - 1);
    } else if (filters.limit !== undefined) {
      dataQuery = dataQuery.limit(filters.limit);
    }

    const [{ data, error, count }, { count: totalCount, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error) throw new Error(error.message);
    if (countError) throw new Error(countError.message);

    const repMap = new Map(
      (
        await findUsersByIds(
          (data ?? []).map((row: any) => row.rep_id).filter(Boolean),
          this.supabase,
        )
      ).map((user) => [user.id, user]),
    );

    return {
      calls: (data ?? []).map((row: SupabaseCallRow) => {
        const rep = repMap.get(row.rep_id);
        return {
          id: row.id,
          status: row.status,
          overallScore: row.overall_score,
          durationSeconds: row.duration_seconds,
          callTopic: row.call_topic,
          repId: row.rep_id,
          createdAt: toDate(row.created_at) ?? new Date(0),
          repFirstName: rep?.firstName ?? null,
          repLastName: rep?.lastName ?? null,
        };
      }),
      total: totalCount ?? count ?? 0,
    };
  }

  private async listHighlights({ orgId, repId }: { orgId?: string; repId?: string }) {
    const supabase: any = this.supabase;
    let momentsQuery = supabase
      .from("call_moments")
      .select("id, call_id, timestamp_seconds, category, observation, recommendation, severity, highlight_note, created_at")
      .eq("is_highlight", true)
      .order("created_at", { ascending: false });

    const callFilterQuery = supabase
      .from("calls")
      .select("id, rep_id, org_id, call_topic, created_at")
      .order("created_at", { ascending: false });

    const [{ data: moments, error: momentsError }, { data: calls, error: callsError }] = await Promise.all([
      momentsQuery,
      orgId
        ? callFilterQuery.eq("org_id", orgId)
        : callFilterQuery.eq("rep_id", repId),
    ]);

    if (momentsError) throw new Error(momentsError.message);
    if (callsError) throw new Error(callsError.message);

    const callMap = new Map<
      string,
      {
        id: string;
        rep_id: string | null;
        org_id?: string | null;
        call_topic: string | null;
        created_at: string | null;
      }
    >((calls ?? []).map((call: any) => [call.id, call]));
    const repMap = new Map(
      (
        await findUsersByIds(
          (calls ?? []).map((call: any) => call.rep_id).filter(Boolean),
          this.supabase,
        )
      ).map((user) => [user.id, user]),
    );

    return (moments ?? [])
      .filter((moment: any) => callMap.has(moment.call_id))
      .map((moment: any) => {
        const call = callMap.get(moment.call_id);
        const rep = call?.rep_id ? repMap.get(call.rep_id) : null;

        return {
          id: moment.id,
          callId: moment.call_id,
          timestampSeconds: moment.timestamp_seconds,
          category: moment.category,
          observation: moment.observation,
          recommendation: moment.recommendation,
          severity: moment.severity,
          highlightNote: moment.highlight_note,
          createdAt: toDate(moment.created_at) ?? new Date(0),
          callTopic: call?.call_topic ?? null,
          callCreatedAt: toDate(call?.created_at) ?? new Date(0),
          repId: call?.rep_id ?? null,
          repFirstName: rep?.firstName ?? null,
          repLastName: rep?.lastName ?? null,
        };
      });
  }
}
