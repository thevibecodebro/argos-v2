import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import {
  getDb,
  organizationsTable,
  trainingModulesTable,
  trainingProgressTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { TrainingRepository } from "./service";

export class DrizzleTrainingRepository implements TrainingRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async countModulesByOrgId(orgId: string) {
    const [row] = await this.db
      .select({ count: count() })
      .from(trainingModulesTable)
      .where(eq(trainingModulesTable.orgId, orgId));

    return Number(row?.count ?? 0);
  }

  async createModules(
    modules: Array<{
      orgId: string;
      title: string;
      description: string;
      skillCategory: string;
      videoUrl: string | null;
      quizData: {
        questions: Array<{ question: string; options: string[]; correctIndex: number }>;
      } | null;
      orderIndex: number;
    }>,
  ) {
    if (modules.length === 0) {
      return;
    }

    await this.db.insert(trainingModulesTable).values(modules);
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

  async findModulesByOrgId(orgId: string) {
    return this.db
      .select({
        id: trainingModulesTable.id,
        orgId: trainingModulesTable.orgId,
        title: trainingModulesTable.title,
        skillCategory: trainingModulesTable.skillCategory,
        videoUrl: trainingModulesTable.videoUrl,
        description: trainingModulesTable.description,
        quizData: trainingModulesTable.quizData,
        orderIndex: trainingModulesTable.orderIndex,
        createdAt: trainingModulesTable.createdAt,
      })
      .from(trainingModulesTable)
      .where(eq(trainingModulesTable.orgId, orgId))
      .orderBy(asc(trainingModulesTable.orderIndex), asc(trainingModulesTable.createdAt))
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          quizData:
            row.quizData && typeof row.quizData === "object"
              ? (row.quizData as {
                  questions: Array<{ question: string; options: string[]; correctIndex: number }>;
                })
              : null,
        })),
      );
  }

  async findProgressByRepId(repId: string) {
    return this.db
      .select({
        id: trainingProgressTable.id,
        repId: trainingProgressTable.repId,
        moduleId: trainingProgressTable.moduleId,
        status: trainingProgressTable.status,
        score: trainingProgressTable.score,
        attempts: trainingProgressTable.attempts,
        completedAt: trainingProgressTable.completedAt,
        assignedBy: trainingProgressTable.assignedBy,
        assignedAt: trainingProgressTable.assignedAt,
        dueDate: trainingProgressTable.dueDate,
      })
      .from(trainingProgressTable)
      .where(eq(trainingProgressTable.repId, repId));
  }

  async findRepIdsByOrgId(orgId: string) {
    const rows = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.orgId, orgId), eq(usersTable.role, "rep")));

    return rows.map((row) => row.id);
  }

  async findTeamProgressByOrgId(orgId: string) {
    const [members, modules] = await Promise.all([
      this.db
        .select({
          repId: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          email: usersTable.email,
        })
        .from(usersTable)
        .where(eq(usersTable.orgId, orgId)),
      this.db
        .select({
          repId: trainingProgressTable.repId,
          status: trainingProgressTable.status,
        })
        .from(trainingProgressTable)
        .innerJoin(usersTable, eq(trainingProgressTable.repId, usersTable.id))
        .where(eq(usersTable.orgId, orgId)),
    ]);

    return members.map((member) => {
      const progress = modules.filter((row) => row.repId === member.repId);
      const assigned = progress.length;
      const passed = progress.filter((row) => row.status === "passed").length;

      return {
        repId: member.repId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        assigned,
        passed,
        completionRate: assigned > 0 ? Math.round((passed / assigned) * 100) : 0,
      };
    });
  }

  async upsertProgress(input: {
    moduleId: string;
    repId: string;
    score: number | null;
    status: "assigned" | "in_progress" | "passed" | "failed";
  }) {
    const [existing] = await this.db
      .select()
      .from(trainingProgressTable)
      .where(
        and(
          eq(trainingProgressTable.repId, input.repId),
          eq(trainingProgressTable.moduleId, input.moduleId),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(trainingProgressTable)
        .set({
          status: input.status,
          score: input.score,
          attempts: sql`${trainingProgressTable.attempts} + 1`,
          completedAt: input.status === "passed" ? new Date() : existing.completedAt,
        })
        .where(eq(trainingProgressTable.id, existing.id))
        .returning({
          id: trainingProgressTable.id,
          repId: trainingProgressTable.repId,
          moduleId: trainingProgressTable.moduleId,
          status: trainingProgressTable.status,
          score: trainingProgressTable.score,
          attempts: trainingProgressTable.attempts,
          completedAt: trainingProgressTable.completedAt,
          assignedBy: trainingProgressTable.assignedBy,
          assignedAt: trainingProgressTable.assignedAt,
          dueDate: trainingProgressTable.dueDate,
        });

      return updated;
    }

    const [created] = await this.db
      .insert(trainingProgressTable)
      .values({
        repId: input.repId,
        moduleId: input.moduleId,
        status: input.status,
        score: input.score,
        attempts: 1,
        completedAt: input.status === "passed" ? new Date() : null,
      })
      .returning({
        id: trainingProgressTable.id,
        repId: trainingProgressTable.repId,
        moduleId: trainingProgressTable.moduleId,
        status: trainingProgressTable.status,
        score: trainingProgressTable.score,
        attempts: trainingProgressTable.attempts,
        completedAt: trainingProgressTable.completedAt,
        assignedBy: trainingProgressTable.assignedBy,
        assignedAt: trainingProgressTable.assignedAt,
        dueDate: trainingProgressTable.dueDate,
      });

    return created;
  }
}
