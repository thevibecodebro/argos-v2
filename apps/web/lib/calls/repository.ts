import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lte, sql } from "drizzle-orm";
import {
  callAnnotationsTable,
  callProcessingJobsTable,
  callMomentsTable,
  callsTable,
  getDb,
  notificationsTable,
  organizationsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { CallsFilters, CallsRepository } from "./service";
import type { CallEvaluation } from "./types";

export class DrizzleCallsRepository implements CallsRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

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
    const [call] = await this.db
      .insert(callsTable)
      .values(input)
      .returning({
        id: callsTable.id,
        status: callsTable.status,
        createdAt: callsTable.createdAt,
      });

    return call;
  }

  async createNotification(input: {
    body: string;
    link: string | null;
    title: string;
    type: "call_scored" | "annotation_added" | "module_assigned";
    userId: string;
  }) {
    await this.db.insert(notificationsTable).values(input);
  }

  async deleteCall(callId: string) {
    await this.db.delete(callsTable).where(eq(callsTable.id, callId));
  }

  async createOrResetCallProcessingJob(input: {
    callId: string;
    sourceOrigin: "manual_upload" | "zoom_recording";
    sourceStoragePath: string;
    sourceFileName: string;
    sourceContentType: string | null;
    sourceSizeBytes: number | null;
  }) {
    await this.db
      .insert(callProcessingJobsTable)
      .values({
        callId: input.callId,
        sourceOrigin: input.sourceOrigin,
        sourceStoragePath: input.sourceStoragePath,
        sourceFileName: input.sourceFileName,
        sourceContentType: input.sourceContentType,
        sourceSizeBytes: input.sourceSizeBytes,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: callProcessingJobsTable.callId,
        set: {
          sourceOrigin: input.sourceOrigin,
          sourceStoragePath: input.sourceStoragePath,
          sourceFileName: input.sourceFileName,
          sourceContentType: input.sourceContentType,
          sourceSizeBytes: input.sourceSizeBytes,
          status: "pending",
          attemptCount: 0,
          nextRunAt: new Date(),
          lockedAt: null,
          lockExpiresAt: null,
          lastStage: null,
          lastError: null,
          updatedAt: new Date(),
        },
      });
  }

  async deleteAnnotation(annotationId: string, callId: string) {
    const deleted = await this.db
      .delete(callAnnotationsTable)
      .where(
        and(
          eq(callAnnotationsTable.id, annotationId),
          eq(callAnnotationsTable.callId, callId),
        ),
      )
      .returning({ id: callAnnotationsTable.id });

    return deleted.length > 0;
  }

  async findAnnotations(callId: string) {
    return this.db
      .select({
        id: callAnnotationsTable.id,
        callId: callAnnotationsTable.callId,
        authorId: callAnnotationsTable.authorId,
        timestampSeconds: callAnnotationsTable.timestampSeconds,
        note: callAnnotationsTable.note,
        createdAt: callAnnotationsTable.createdAt,
        authorFirstName: usersTable.firstName,
        authorLastName: usersTable.lastName,
        authorRole: usersTable.role,
      })
      .from(callAnnotationsTable)
      .leftJoin(usersTable, eq(callAnnotationsTable.authorId, usersTable.id))
      .where(eq(callAnnotationsTable.callId, callId))
      .orderBy(desc(callAnnotationsTable.createdAt));
  }

  async findCallById(callId: string) {
    const [callRow] = await this.db
      .select({
        id: callsTable.id,
        status: callsTable.status,
        recordingUrl: callsTable.recordingUrl,
        transcriptUrl: callsTable.transcriptUrl,
        durationSeconds: callsTable.durationSeconds,
        callTopic: callsTable.callTopic,
        overallScore: callsTable.overallScore,
        frameControlScore: callsTable.frameControlScore,
        rapportScore: callsTable.rapportScore,
        discoveryScore: callsTable.discoveryScore,
        painExpansionScore: callsTable.painExpansionScore,
        solutionScore: callsTable.solutionScore,
        objectionScore: callsTable.objectionScore,
        closingScore: callsTable.closingScore,
        confidence: callsTable.confidence,
        callStageReached: callsTable.callStageReached,
        strengths: callsTable.strengths,
        improvements: callsTable.improvements,
        recommendedDrills: callsTable.recommendedDrills,
        transcript: callsTable.transcript,
        repId: callsTable.repId,
        orgId: callsTable.orgId,
        createdAt: callsTable.createdAt,
        repFirstName: usersTable.firstName,
        repLastName: usersTable.lastName,
      })
      .from(callsTable)
      .leftJoin(usersTable, eq(callsTable.repId, usersTable.id))
      .where(eq(callsTable.id, callId))
      .limit(1);

    if (!callRow) {
      return null;
    }

    const moments = await this.db
      .select({
        id: callMomentsTable.id,
        callId: callMomentsTable.callId,
        timestampSeconds: callMomentsTable.timestampSeconds,
        category: callMomentsTable.category,
        observation: callMomentsTable.observation,
        recommendation: callMomentsTable.recommendation,
        severity: callMomentsTable.severity,
        isHighlight: callMomentsTable.isHighlight,
        highlightNote: callMomentsTable.highlightNote,
        createdAt: callMomentsTable.createdAt,
      })
      .from(callMomentsTable)
      .where(eq(callMomentsTable.callId, callId))
      .orderBy(asc(callMomentsTable.timestampSeconds), asc(callMomentsTable.createdAt));

    return {
      ...callRow,
      strengths: Array.isArray(callRow.strengths) ? (callRow.strengths as string[]) : null,
      improvements: Array.isArray(callRow.improvements) ? (callRow.improvements as string[]) : null,
      recommendedDrills: Array.isArray(callRow.recommendedDrills)
        ? (callRow.recommendedDrills as string[])
        : null,
      transcript: Array.isArray(callRow.transcript) ? callRow.transcript : null,
      moments,
    };
  }

  async findCallsByOrgId(orgId: string, filters: CallsFilters) {
    return this.listCalls({ filters, orgId });
  }

  async findCallsByRepId(repId: string, filters: CallsFilters) {
    return this.listCalls({ filters, repId });
  }

  async findCallsByRepIds(repIds: string[], filters: CallsFilters) {
    if (!repIds.length) {
      return {
        calls: [],
        total: 0,
      };
    }

    return this.listCalls({ filters, repIds });
  }

  async findCurrentUserByAuthId(authUserId: string) {
    const [record] = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        org: {
          id: organizationsTable.id,
          name: organizationsTable.name,
          slug: organizationsTable.slug,
          plan: organizationsTable.plan,
        },
      })
      .from(usersTable)
      .leftJoin(organizationsTable, eq(usersTable.orgId, organizationsTable.id))
      .where(eq(usersTable.id, authUserId))
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      ...record,
      role: parseAppUserRole(record.role),
    };
  }

  async findHighlightsByOrgId(orgId: string) {
    return this.db
      .select({
        id: callMomentsTable.id,
        callId: callMomentsTable.callId,
        timestampSeconds: callMomentsTable.timestampSeconds,
        category: callMomentsTable.category,
        observation: callMomentsTable.observation,
        recommendation: callMomentsTable.recommendation,
        severity: callMomentsTable.severity,
        highlightNote: callMomentsTable.highlightNote,
        createdAt: callMomentsTable.createdAt,
        callTopic: callsTable.callTopic,
        callCreatedAt: callsTable.createdAt,
        repId: callsTable.repId,
        repFirstName: usersTable.firstName,
        repLastName: usersTable.lastName,
      })
      .from(callMomentsTable)
      .innerJoin(callsTable, eq(callMomentsTable.callId, callsTable.id))
      .leftJoin(usersTable, eq(callsTable.repId, usersTable.id))
      .where(
        and(
          eq(callsTable.orgId, orgId),
          eq(callMomentsTable.isHighlight, true),
        ),
      )
      .orderBy(desc(callMomentsTable.createdAt));
  }

  async findHighlightsByRepId(repId: string) {
    return this.db
      .select({
        id: callMomentsTable.id,
        callId: callMomentsTable.callId,
        timestampSeconds: callMomentsTable.timestampSeconds,
        category: callMomentsTable.category,
        observation: callMomentsTable.observation,
        recommendation: callMomentsTable.recommendation,
        severity: callMomentsTable.severity,
        highlightNote: callMomentsTable.highlightNote,
        createdAt: callMomentsTable.createdAt,
        callTopic: callsTable.callTopic,
        callCreatedAt: callsTable.createdAt,
        repId: callsTable.repId,
        repFirstName: usersTable.firstName,
        repLastName: usersTable.lastName,
      })
      .from(callMomentsTable)
      .innerJoin(callsTable, eq(callMomentsTable.callId, callsTable.id))
      .leftJoin(usersTable, eq(callsTable.repId, usersTable.id))
      .where(
        and(
          eq(callsTable.repId, repId),
          eq(callMomentsTable.isHighlight, true),
        ),
      )
      .orderBy(desc(callMomentsTable.createdAt));
  }

  async findScoreTrend(repId: string, since: Date) {
    return this.db
      .select({
        callId: callsTable.id,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        frameControl: callsTable.frameControlScore,
        rapport: callsTable.rapportScore,
        discovery: callsTable.discoveryScore,
        painExpansion: callsTable.painExpansionScore,
        solution: callsTable.solutionScore,
        objection: callsTable.objectionScore,
        closing: callsTable.closingScore,
      })
      .from(callsTable)
      .where(
        and(
          eq(callsTable.repId, repId),
          eq(callsTable.status, "complete"),
          gte(callsTable.createdAt, since),
          isNotNull(callsTable.overallScore),
        ),
      )
      .orderBy(asc(callsTable.createdAt));
  }

  async insertAnnotation(input: {
    authorId: string;
    callId: string;
    note: string;
    timestampSeconds: number | null;
  }) {
    const [annotation] = await this.db
      .insert(callAnnotationsTable)
      .values(input)
      .returning({
        id: callAnnotationsTable.id,
        callId: callAnnotationsTable.callId,
        authorId: callAnnotationsTable.authorId,
        timestampSeconds: callAnnotationsTable.timestampSeconds,
        note: callAnnotationsTable.note,
        createdAt: callAnnotationsTable.createdAt,
      });

    const [author] = await this.db
      .select({
        authorFirstName: usersTable.firstName,
        authorLastName: usersTable.lastName,
        authorRole: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, annotation.authorId))
      .limit(1);

    return {
      ...annotation,
      authorFirstName: author?.authorFirstName ?? null,
      authorLastName: author?.authorLastName ?? null,
      authorRole: author?.authorRole ?? null,
    };
  }

  async setCallEvaluation(callId: string, evaluation: CallEvaluation) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(callsTable)
        .set({
          status: "complete",
          durationSeconds: evaluation.durationSeconds,
          overallScore: evaluation.overallScore,
          frameControlScore: evaluation.frameControlScore,
          rapportScore: evaluation.rapportScore,
          discoveryScore: evaluation.discoveryScore,
          painExpansionScore: evaluation.painExpansionScore,
          solutionScore: evaluation.solutionScore,
          objectionScore: evaluation.objectionScore,
          closingScore: evaluation.closingScore,
          confidence: evaluation.confidence,
          callStageReached: evaluation.callStageReached,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          recommendedDrills: evaluation.recommendedDrills,
          transcript: evaluation.transcript,
        })
        .where(eq(callsTable.id, callId));

      await tx.delete(callMomentsTable).where(eq(callMomentsTable.callId, callId));

      if (evaluation.moments.length > 0) {
        await tx.insert(callMomentsTable).values(
          evaluation.moments.map((moment) => ({
            callId,
            timestampSeconds: moment.timestampSeconds,
            category: moment.category,
            observation: moment.observation,
            recommendation: moment.recommendation,
            severity: moment.severity,
            isHighlight: moment.isHighlight,
            highlightNote: moment.highlightNote,
          })),
        );
      }
    });
  }

  async updateCallRecording(callId: string, recordingUrl: string | null) {
    await this.db
      .update(callsTable)
      .set({ recordingUrl })
      .where(eq(callsTable.id, callId));
  }

  async updateCallStatus(
    callId: string,
    status: "uploaded" | "transcribing" | "evaluating" | "complete" | "failed",
  ) {
    await this.db
      .update(callsTable)
      .set({ status })
      .where(eq(callsTable.id, callId));
  }

  async updateCallTopic(callId: string, callTopic: string | null) {
    const [updated] = await this.db
      .update(callsTable)
      .set({ callTopic })
      .where(eq(callsTable.id, callId))
      .returning({
        id: callsTable.id,
        callTopic: callsTable.callTopic,
      });

    return updated;
  }

  async updateMomentHighlight(
    callId: string,
    momentId: string,
    isHighlight: boolean,
    highlightNote: string | null,
  ) {
    const [updated] = await this.db
      .update(callMomentsTable)
      .set({ isHighlight, highlightNote })
      .where(
        and(
          eq(callMomentsTable.id, momentId),
          eq(callMomentsTable.callId, callId),
        ),
      )
      .returning({
        id: callMomentsTable.id,
        callId: callMomentsTable.callId,
        timestampSeconds: callMomentsTable.timestampSeconds,
        category: callMomentsTable.category,
        observation: callMomentsTable.observation,
        recommendation: callMomentsTable.recommendation,
        severity: callMomentsTable.severity,
        isHighlight: callMomentsTable.isHighlight,
        highlightNote: callMomentsTable.highlightNote,
        createdAt: callMomentsTable.createdAt,
      });

    return updated ?? null;
  }

  private async listCalls(input: {
    filters: CallsFilters;
    orgId?: string;
    repId?: string;
    repIds?: string[];
  }) {
    const { filters, orgId, repId, repIds } = input;
    const limit = Math.min(filters.limit ?? 25, 100);
    const offset = filters.offset ?? 0;
    const sortBy = filters.sortBy ?? "createdAt";
    const sortOrder = filters.sortOrder ?? "desc";

    const conditions = [];

    if (orgId) {
      conditions.push(eq(callsTable.orgId, orgId));
    }

    if (repId) {
      conditions.push(eq(callsTable.repId, repId));
    }

    if (repIds?.length) {
      conditions.push(inArray(callsTable.repId, repIds));
    }

    if (filters.search?.trim()) {
      conditions.push(ilike(callsTable.callTopic, `%${filters.search.trim()}%`));
    }

    if (filters.status && filters.status !== "all") {
      if (filters.status === "processing") {
        conditions.push(inArray(callsTable.status, ["transcribing", "evaluating"]));
      } else {
        conditions.push(eq(callsTable.status, filters.status as "uploaded" | "transcribing" | "evaluating" | "complete" | "failed"));
      }
    }

    if (filters.minScore !== undefined) {
      conditions.push(isNotNull(callsTable.overallScore));
      conditions.push(gte(callsTable.overallScore, filters.minScore));
    }

    if (filters.maxScore !== undefined) {
      conditions.push(isNotNull(callsTable.overallScore));
      conditions.push(lte(callsTable.overallScore, filters.maxScore));
    }

    const whereCondition = conditions.length ? and(...conditions) : undefined;
    const sortColumn = sortBy === "overallScore" ? callsTable.overallScore : callsTable.createdAt;
    const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

    const [calls, totalRows] = await Promise.all([
      this.db
        .select({
          id: callsTable.id,
          status: callsTable.status,
          overallScore: callsTable.overallScore,
          durationSeconds: callsTable.durationSeconds,
          callTopic: callsTable.callTopic,
          repId: callsTable.repId,
          createdAt: callsTable.createdAt,
          repFirstName: usersTable.firstName,
          repLastName: usersTable.lastName,
        })
        .from(callsTable)
        .leftJoin(usersTable, eq(callsTable.repId, usersTable.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(callsTable)
        .where(whereCondition),
    ]);

    return {
      calls,
      total: Number(totalRows[0]?.count ?? 0),
    };
  }
}
