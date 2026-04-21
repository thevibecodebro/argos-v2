import { and, asc, count, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import {
  callScoresTable,
  callsTable,
  getDb,
  organizationsTable,
  roleplaySessionsTable,
  rubricCategoriesTable,
  rubricsTable,
  trainingProgressTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { DashboardRepository } from "./service";

export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

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

  async findRecentCallsByRepId(repId: string, limit: number) {
    return this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        status: callsTable.status,
        durationSeconds: callsTable.durationSeconds,
        repFirstName: usersTable.firstName,
        repLastName: usersTable.lastName,
      })
      .from(callsTable)
      .leftJoin(usersTable, eq(callsTable.repId, usersTable.id))
      .where(eq(callsTable.repId, repId))
      .orderBy(desc(callsTable.createdAt))
      .limit(limit);
  }

  async findScoredCallsByRepIdSince(repId: string, since: Date) {
    const calls = await this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        durationSeconds: callsTable.durationSeconds,
        rubricId: callsTable.rubricId,
        frameControlScore: callsTable.frameControlScore,
        rapportScore: callsTable.rapportScore,
        discoveryScore: callsTable.discoveryScore,
        painExpansionScore: callsTable.painExpansionScore,
        solutionScore: callsTable.solutionScore,
        objectionScore: callsTable.objectionScore,
        closingScore: callsTable.closingScore,
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
      .orderBy(desc(callsTable.createdAt));

    return this.attachRubricData(calls);
  }

  async findCompletedCallsByRepId(repId: string) {
    const calls = await this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        durationSeconds: callsTable.durationSeconds,
        rubricId: callsTable.rubricId,
        frameControlScore: callsTable.frameControlScore,
        rapportScore: callsTable.rapportScore,
        discoveryScore: callsTable.discoveryScore,
        painExpansionScore: callsTable.painExpansionScore,
        solutionScore: callsTable.solutionScore,
        objectionScore: callsTable.objectionScore,
        closingScore: callsTable.closingScore,
      })
      .from(callsTable)
      .where(and(eq(callsTable.repId, repId), eq(callsTable.status, "complete")))
      .orderBy(callsTable.createdAt);

    return this.attachRubricData(calls);
  }

  async findCompletedCallsByOrgId(orgId: string) {
    const calls = await this.db
      .select({
        id: callsTable.id,
        repId: callsTable.repId,
        callTopic: callsTable.callTopic,
        createdAt: callsTable.createdAt,
        overallScore: callsTable.overallScore,
        durationSeconds: callsTable.durationSeconds,
        rubricId: callsTable.rubricId,
        frameControlScore: callsTable.frameControlScore,
        rapportScore: callsTable.rapportScore,
        discoveryScore: callsTable.discoveryScore,
        painExpansionScore: callsTable.painExpansionScore,
        solutionScore: callsTable.solutionScore,
        objectionScore: callsTable.objectionScore,
        closingScore: callsTable.closingScore,
      })
      .from(callsTable)
      .where(and(eq(callsTable.orgId, orgId), eq(callsTable.status, "complete")))
      .orderBy(callsTable.createdAt);

    return this.attachRubricData(calls);
  }

  async findOrgUsersByOrgId(orgId: string) {
    return this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.orgId, orgId))
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          role: parseAppUserRole(row.role),
        })),
      );
  }

  async findTrainingProgressByOrgId(orgId: string) {
    return this.db
      .select({
        repId: trainingProgressTable.repId,
        status: trainingProgressTable.status,
      })
      .from(trainingProgressTable)
      .innerJoin(usersTable, eq(trainingProgressTable.repId, usersTable.id))
      .where(eq(usersTable.orgId, orgId));
  }

  async findPassedTrainingByRepId(repId: string) {
    return this.db
      .select({
        completedAt: trainingProgressTable.completedAt,
      })
      .from(trainingProgressTable)
      .where(and(eq(trainingProgressTable.repId, repId), eq(trainingProgressTable.status, "passed")))
      .orderBy(trainingProgressTable.completedAt)
      .then((rows) =>
        rows
          .map((row) => row.completedAt)
          .filter((value): value is Date => value instanceof Date),
      );
  }

  async findCompletedRoleplaysByRepId(repId: string) {
    return this.db
      .select({
        createdAt: roleplaySessionsTable.createdAt,
      })
      .from(roleplaySessionsTable)
      .where(and(eq(roleplaySessionsTable.repId, repId), eq(roleplaySessionsTable.status, "complete")))
      .orderBy(roleplaySessionsTable.createdAt)
      .then((rows) =>
        rows
          .map((row) => row.createdAt)
          .filter((value): value is Date => value instanceof Date),
      );
  }

  async findCallCountByOrgIdSince(orgId: string, since: Date) {
    const [row] = await this.db
      .select({ count: count() })
      .from(callsTable)
      .where(and(eq(callsTable.orgId, orgId), gte(callsTable.createdAt, since)));

    return row?.count ?? 0;
  }

  async findCompletedRoleplayCountByOrgId(orgId: string) {
    const [row] = await this.db
      .select({ count: count() })
      .from(roleplaySessionsTable)
      .where(and(eq(roleplaySessionsTable.orgId, orgId), eq(roleplaySessionsTable.status, "complete")));

    return row?.count ?? 0;
  }

  private async attachRubricData<
    T extends {
      id: string;
      rubricId: string | null;
    },
  >(calls: T[]) {
    if (!calls.length) {
      return calls.map((call) => ({
        ...call,
        rubricVersion: null,
        rubricName: null,
        categoryScores: [],
      }));
    }

    const callIds = calls.map((call) => call.id);
    const rubricIds = Array.from(
      new Set(
        calls
          .map((call) => call.rubricId)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    if (!rubricIds.length) {
      return calls.map((call) => ({
        ...call,
        rubricVersion: null,
        rubricName: null,
        categoryScores: [],
      }));
    }

    const [rubrics, categories, scores] = await Promise.all([
      this.db
        .select({
          id: rubricsTable.id,
          name: rubricsTable.name,
          version: rubricsTable.version,
        })
        .from(rubricsTable)
        .where(inArray(rubricsTable.id, rubricIds)),
      this.db
        .select({
          id: rubricCategoriesTable.id,
          rubricId: rubricCategoriesTable.rubricId,
          slug: rubricCategoriesTable.slug,
          name: rubricCategoriesTable.name,
          sortOrder: rubricCategoriesTable.sortOrder,
        })
        .from(rubricCategoriesTable)
        .where(inArray(rubricCategoriesTable.rubricId, rubricIds))
        .orderBy(asc(rubricCategoriesTable.sortOrder), asc(rubricCategoriesTable.createdAt)),
      this.db
        .select({
          callId: callScoresTable.callId,
          rubricCategoryId: callScoresTable.rubricCategoryId,
          score: callScoresTable.score,
        })
        .from(callScoresTable)
        .where(inArray(callScoresTable.callId, callIds)),
    ]);

    const rubricById = new Map(rubrics.map((rubric) => [rubric.id, rubric]));
    const categoriesByRubricId = new Map<string, typeof categories>();

    for (const category of categories) {
      const bucket = categoriesByRubricId.get(category.rubricId) ?? [];
      bucket.push(category);
      categoriesByRubricId.set(category.rubricId, bucket);
    }

    const scoresByCallId = new Map<string, Map<string, number>>();

    for (const score of scores) {
      const bucket = scoresByCallId.get(score.callId) ?? new Map<string, number>();
      bucket.set(score.rubricCategoryId, score.score);
      scoresByCallId.set(score.callId, bucket);
    }

    return calls.map((call) => {
      const rubric = call.rubricId ? rubricById.get(call.rubricId) ?? null : null;
      const rubricCategories = call.rubricId ? categoriesByRubricId.get(call.rubricId) ?? [] : [];
      const callScores = scoresByCallId.get(call.id) ?? new Map<string, number>();

      return {
        ...call,
        rubricVersion: rubric?.version ?? null,
        rubricName: rubric?.name ?? null,
        categoryScores: rubricCategories.map((category) => ({
          slug: category.slug,
          name: category.name,
          score: callScores.get(category.id) ?? null,
          sortOrder: category.sortOrder,
        })),
      };
    });
  }
}
