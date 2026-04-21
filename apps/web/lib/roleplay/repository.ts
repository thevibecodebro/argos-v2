import { desc, eq } from "drizzle-orm";
import {
  getDb,
  organizationsTable,
  roleplaySessionsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type {
  RoleplayRepository,
  RoleplayScorecard,
  RoleplaySessionRecord,
} from "./service";
import {
  normalizeRoleplaySessionCreateInput,
  type RoleplaySessionCreateInput,
} from "./types";

function normalizeSessionRecord(record: {
  id: string;
  repId: string;
  orgId: string;
  persona: string | null;
  industry: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  overallScore: number | null;
  origin: "manual" | "generated_from_call";
  sourceCallId: string | null;
  rubricId: string | null;
  focusMode: "all" | "category";
  focusCategorySlug: string | null;
  scenarioSummary: string | null;
  scenarioBrief: string | null;
  transcript: unknown;
  scorecard: unknown;
  status: "active" | "evaluating" | "complete";
  createdAt: Date;
}): RoleplaySessionRecord {
  return {
    ...record,
    origin: record.origin ?? "manual",
    sourceCallId: record.sourceCallId ?? null,
    rubricId: record.rubricId ?? null,
    focusMode: record.focusMode ?? "all",
    focusCategorySlug: record.focusCategorySlug ?? null,
    scenarioSummary: record.scenarioSummary ?? null,
    scenarioBrief: record.scenarioBrief ?? null,
    transcript: Array.isArray(record.transcript)
      ? (record.transcript as RoleplaySessionRecord["transcript"])
      : null,
    scorecard:
      record.scorecard && typeof record.scorecard === "object"
        ? (record.scorecard as RoleplayScorecard)
        : null,
  };
}

export class DrizzleRoleplayRepository implements RoleplayRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async createSession(input: RoleplaySessionCreateInput) {
    const sessionInput = normalizeRoleplaySessionCreateInput(input);
    const [session] = await this.db
      .insert(roleplaySessionsTable)
      .values(sessionInput)
      .returning({
        id: roleplaySessionsTable.id,
        repId: roleplaySessionsTable.repId,
        orgId: roleplaySessionsTable.orgId,
        persona: roleplaySessionsTable.persona,
        industry: roleplaySessionsTable.industry,
        difficulty: roleplaySessionsTable.difficulty,
        overallScore: roleplaySessionsTable.overallScore,
        origin: roleplaySessionsTable.origin,
        sourceCallId: roleplaySessionsTable.sourceCallId,
        rubricId: roleplaySessionsTable.rubricId,
        focusMode: roleplaySessionsTable.focusMode,
        focusCategorySlug: roleplaySessionsTable.focusCategorySlug,
        scenarioSummary: roleplaySessionsTable.scenarioSummary,
        scenarioBrief: roleplaySessionsTable.scenarioBrief,
        transcript: roleplaySessionsTable.transcript,
        scorecard: roleplaySessionsTable.scorecard,
        status: roleplaySessionsTable.status,
        createdAt: roleplaySessionsTable.createdAt,
      });

    return normalizeSessionRecord(session);
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

  async findSessionById(sessionId: string) {
    const [session] = await this.db
      .select({
        id: roleplaySessionsTable.id,
        repId: roleplaySessionsTable.repId,
        orgId: roleplaySessionsTable.orgId,
        persona: roleplaySessionsTable.persona,
        industry: roleplaySessionsTable.industry,
        difficulty: roleplaySessionsTable.difficulty,
        overallScore: roleplaySessionsTable.overallScore,
        origin: roleplaySessionsTable.origin,
        sourceCallId: roleplaySessionsTable.sourceCallId,
        rubricId: roleplaySessionsTable.rubricId,
        focusMode: roleplaySessionsTable.focusMode,
        focusCategorySlug: roleplaySessionsTable.focusCategorySlug,
        scenarioSummary: roleplaySessionsTable.scenarioSummary,
        scenarioBrief: roleplaySessionsTable.scenarioBrief,
        transcript: roleplaySessionsTable.transcript,
        scorecard: roleplaySessionsTable.scorecard,
        status: roleplaySessionsTable.status,
        createdAt: roleplaySessionsTable.createdAt,
      })
      .from(roleplaySessionsTable)
      .where(eq(roleplaySessionsTable.id, sessionId))
      .limit(1);

    return session ? normalizeSessionRecord(session) : null;
  }

  async findSessionsByOrgId(orgId: string) {
    const rows = await this.db
      .select({
        id: roleplaySessionsTable.id,
        repId: roleplaySessionsTable.repId,
        orgId: roleplaySessionsTable.orgId,
        persona: roleplaySessionsTable.persona,
        industry: roleplaySessionsTable.industry,
        difficulty: roleplaySessionsTable.difficulty,
        overallScore: roleplaySessionsTable.overallScore,
        origin: roleplaySessionsTable.origin,
        sourceCallId: roleplaySessionsTable.sourceCallId,
        rubricId: roleplaySessionsTable.rubricId,
        focusMode: roleplaySessionsTable.focusMode,
        focusCategorySlug: roleplaySessionsTable.focusCategorySlug,
        scenarioSummary: roleplaySessionsTable.scenarioSummary,
        scenarioBrief: roleplaySessionsTable.scenarioBrief,
        transcript: roleplaySessionsTable.transcript,
        scorecard: roleplaySessionsTable.scorecard,
        status: roleplaySessionsTable.status,
        createdAt: roleplaySessionsTable.createdAt,
      })
      .from(roleplaySessionsTable)
      .where(eq(roleplaySessionsTable.orgId, orgId))
      .orderBy(desc(roleplaySessionsTable.createdAt));

    return rows.map(normalizeSessionRecord);
  }

  async findSessionsByRepId(repId: string) {
    const rows = await this.db
      .select({
        id: roleplaySessionsTable.id,
        repId: roleplaySessionsTable.repId,
        orgId: roleplaySessionsTable.orgId,
        persona: roleplaySessionsTable.persona,
        industry: roleplaySessionsTable.industry,
        difficulty: roleplaySessionsTable.difficulty,
        overallScore: roleplaySessionsTable.overallScore,
        origin: roleplaySessionsTable.origin,
        sourceCallId: roleplaySessionsTable.sourceCallId,
        rubricId: roleplaySessionsTable.rubricId,
        focusMode: roleplaySessionsTable.focusMode,
        focusCategorySlug: roleplaySessionsTable.focusCategorySlug,
        scenarioSummary: roleplaySessionsTable.scenarioSummary,
        scenarioBrief: roleplaySessionsTable.scenarioBrief,
        transcript: roleplaySessionsTable.transcript,
        scorecard: roleplaySessionsTable.scorecard,
        status: roleplaySessionsTable.status,
        createdAt: roleplaySessionsTable.createdAt,
      })
      .from(roleplaySessionsTable)
      .where(eq(roleplaySessionsTable.repId, repId))
      .orderBy(desc(roleplaySessionsTable.createdAt));

    return rows.map(normalizeSessionRecord);
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
    const [session] = await this.db
      .update(roleplaySessionsTable)
      .set({
      overallScore: patch.overallScore,
      scorecard: patch.scorecard,
      status: patch.status,
      transcript: patch.transcript,
    })
      .where(eq(roleplaySessionsTable.id, sessionId))
      .returning({
        id: roleplaySessionsTable.id,
        repId: roleplaySessionsTable.repId,
        orgId: roleplaySessionsTable.orgId,
        persona: roleplaySessionsTable.persona,
        industry: roleplaySessionsTable.industry,
        difficulty: roleplaySessionsTable.difficulty,
        overallScore: roleplaySessionsTable.overallScore,
        origin: roleplaySessionsTable.origin,
        sourceCallId: roleplaySessionsTable.sourceCallId,
        rubricId: roleplaySessionsTable.rubricId,
        focusMode: roleplaySessionsTable.focusMode,
        focusCategorySlug: roleplaySessionsTable.focusCategorySlug,
        scenarioSummary: roleplaySessionsTable.scenarioSummary,
        scenarioBrief: roleplaySessionsTable.scenarioBrief,
        transcript: roleplaySessionsTable.transcript,
        scorecard: roleplaySessionsTable.scorecard,
        status: roleplaySessionsTable.status,
        createdAt: roleplaySessionsTable.createdAt,
      });

    return normalizeSessionRecord(session);
  }
}
