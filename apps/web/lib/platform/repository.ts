import { and, asc, desc, eq, gt, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import {
  billingSubscriptionsTable,
  callsTable,
  getDb,
  invitesTable,
  organizationsTable,
  platformAccessSessionsTable,
  platformAuditEventsTable,
  platformStaffTable,
  roleplaySessionsTable,
  trainingModulesTable,
  trainingProgressTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { coerceStoredWorkspaceTheme } from "@/lib/organizations/workspace-theme";
import type { AppUserRole } from "@/lib/users/roles";
import {
  buildPlatformDashboardSnapshot,
  type PlatformDashboardFilters,
  type PlatformDashboardOrganizationAggregate,
} from "./dashboard";
import { buildPlatformOrganizationDetailSnapshot } from "./organization-detail";

export type PlatformStaffRole = "owner" | "operator";
export type PlatformStaffStatus = "active" | "revoked";
export type PlatformAccessSessionStatus = "active" | "ended" | "expired";

const staffSelection = {
  userId: platformStaffTable.userId,
  role: platformStaffTable.role,
  status: platformStaffTable.status,
  createdBy: platformStaffTable.createdBy,
  revokedBy: platformStaffTable.revokedBy,
  createdAt: platformStaffTable.createdAt,
  updatedAt: platformStaffTable.updatedAt,
  revokedAt: platformStaffTable.revokedAt,
};

const accessSessionSelection = {
  id: platformAccessSessionsTable.id,
  staffUserId: platformAccessSessionsTable.staffUserId,
  targetOrgId: platformAccessSessionsTable.targetOrgId,
  staffEmailSnapshot: platformAccessSessionsTable.staffEmailSnapshot,
  staffRoleSnapshot: platformAccessSessionsTable.staffRoleSnapshot,
  targetOrgNameSnapshot: platformAccessSessionsTable.targetOrgNameSnapshot,
  targetOrgSlugSnapshot: platformAccessSessionsTable.targetOrgSlugSnapshot,
  reason: platformAccessSessionsTable.reason,
  status: platformAccessSessionsTable.status,
  startedAt: platformAccessSessionsTable.startedAt,
  expiresAt: platformAccessSessionsTable.expiresAt,
  endedAt: platformAccessSessionsTable.endedAt,
};

const auditEventSelection = {
  id: platformAuditEventsTable.id,
  staffUserId: platformAuditEventsTable.staffUserId,
  targetOrgId: platformAuditEventsTable.targetOrgId,
  sessionId: platformAuditEventsTable.sessionId,
  staffEmailSnapshot: platformAuditEventsTable.staffEmailSnapshot,
  staffRoleSnapshot: platformAuditEventsTable.staffRoleSnapshot,
  targetOrgNameSnapshot: platformAuditEventsTable.targetOrgNameSnapshot,
  targetOrgSlugSnapshot: platformAuditEventsTable.targetOrgSlugSnapshot,
  action: platformAuditEventsTable.action,
  resourceType: platformAuditEventsTable.resourceType,
  resourceId: platformAuditEventsTable.resourceId,
  reason: platformAuditEventsTable.reason,
  metadata: platformAuditEventsTable.metadata,
  createdAt: platformAuditEventsTable.createdAt,
};

const organizationSelection = {
  archiveReason: organizationsTable.archiveReason,
  archivedAt: organizationsTable.archivedAt,
  archivedBy: organizationsTable.archivedBy,
  id: organizationsTable.id,
  name: organizationsTable.name,
  slug: organizationsTable.slug,
  plan: organizationsTable.plan,
  status: organizationsTable.status,
  createdAt: organizationsTable.createdAt,
};

const inviteSelection = {
  id: invitesTable.id,
  orgId: invitesTable.orgId,
  email: invitesTable.email,
  role: invitesTable.role,
  token: invitesTable.token,
  teamIds: invitesTable.teamIds,
  expiresAt: invitesTable.expiresAt,
  acceptedAt: invitesTable.acceptedAt,
  createdAt: invitesTable.createdAt,
};

type PlatformAccessContext = {
  staffEmailSnapshot: string;
  staffRoleSnapshot: PlatformStaffRole;
  staffUserId: string;
  targetOrgId: string;
  targetOrgNameSnapshot: string;
  targetOrgSlugSnapshot: string;
};

export class DrizzlePlatformRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findStaffByUserId(userId: string) {
    const [staff] = await this.db
      .select(staffSelection)
      .from(platformStaffTable)
      .where(eq(platformStaffTable.userId, userId))
      .limit(1);

    return staff ?? null;
  }

  async upsertStaff(input: {
    userId: string;
    role: PlatformStaffRole;
    createdBy?: string | null;
    status?: PlatformStaffStatus;
  }) {
    const status = input.status ?? "active";
    const revokedBy = status === "active" ? null : undefined;
    const revokedAt = status === "active" ? null : undefined;

    const [staff] = await this.db
      .insert(platformStaffTable)
      .values({
        userId: input.userId,
        role: input.role,
        status,
        createdBy: input.createdBy ?? null,
        revokedBy,
        revokedAt,
      })
      .onConflictDoUpdate({
        target: platformStaffTable.userId,
        set: {
          role: input.role,
          status,
          revokedBy,
          revokedAt,
          updatedAt: new Date(),
        },
      })
      .returning(staffSelection);

    if (!staff) {
      throw new Error("Failed to upsert platform staff");
    }

    return staff;
  }

  async revokeStaff(input: {
    userId: string;
    revokedBy: string | null;
    revokedAt?: Date;
  }) {
    const revokedAt = input.revokedAt ?? new Date();
    const revoked = await this.db
      .update(platformStaffTable)
      .set({
        status: "revoked",
        revokedBy: input.revokedBy,
        revokedAt,
        updatedAt: new Date(),
      })
      .where(eq(platformStaffTable.userId, input.userId))
      .returning({ userId: platformStaffTable.userId });

    return revoked.length > 0;
  }

  async listStaff() {
    return this.db
      .select({
        ...staffSelection,
        email: usersTable.email,
      })
      .from(platformStaffTable)
      .leftJoin(usersTable, eq(platformStaffTable.userId, usersTable.id))
      .orderBy(desc(platformStaffTable.createdAt));
  }

  async findUserByEmail(email: string) {
    const [user] = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        orgId: usersTable.orgId,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    return user ?? null;
  }

  async createAccessSession(input: {
    staffUserId: string;
    targetOrgId: string;
    reason: string;
    expiresAt: Date;
  }) {
    const context = await this.findActiveAccessContext(this.db, input);

    return this.insertAccessSession(this.db, input, context);
  }

  async createAccessSessionWithAuditEvent(input: {
    staffUserId: string;
    targetOrgId: string;
    reason: string;
    expiresAt: Date;
    audit: {
      action: string;
      resourceType: string;
      resourceId?: string | null;
      metadata?: Record<string, unknown>;
    };
  }) {
    return this.db.transaction(async (tx) => {
      const transactionDb = tx as ArgosDb;
      const context = await this.findActiveAccessContext(transactionDb, input);
      const session = await this.insertAccessSession(transactionDb, input, context);
      const auditEvent = await this.insertAuditEvent(transactionDb, {
        staffUserId: input.staffUserId,
        targetOrgId: input.targetOrgId,
        sessionId: session.id,
        staffEmailSnapshot: context.staffEmailSnapshot,
        staffRoleSnapshot: context.staffRoleSnapshot,
        targetOrgNameSnapshot: context.targetOrgNameSnapshot,
        targetOrgSlugSnapshot: context.targetOrgSlugSnapshot,
        action: input.audit.action,
        resourceType: input.audit.resourceType,
        resourceId: input.audit.resourceId ?? null,
        reason: input.reason,
        metadata: input.audit.metadata ?? {},
      });

      return {
        auditEvent,
        session,
      };
    });
  }

  private async findActiveAccessContext(
    db: ArgosDb,
    input: {
      staffUserId: string;
      targetOrgId: string;
    },
  ): Promise<PlatformAccessContext> {
    const [context] = await db
      .select({
        staffUserId: platformStaffTable.userId,
        staffEmailSnapshot: usersTable.email,
        staffRoleSnapshot: platformStaffTable.role,
        targetOrgId: organizationsTable.id,
        targetOrgNameSnapshot: organizationsTable.name,
        targetOrgSlugSnapshot: organizationsTable.slug,
      })
      .from(platformStaffTable)
      .leftJoin(usersTable, eq(platformStaffTable.userId, usersTable.id))
      .leftJoin(organizationsTable, eq(organizationsTable.id, input.targetOrgId))
      .where(
        and(
          eq(platformStaffTable.userId, input.staffUserId),
          eq(platformStaffTable.status, "active"),
          eq(organizationsTable.status, "active"),
        ),
      )
      .limit(1);

    if (!context?.staffUserId || !context.staffEmailSnapshot || !context.staffRoleSnapshot) {
      throw new Error("Active platform staff is required to create an access session");
    }

    if (!context.targetOrgId || !context.targetOrgNameSnapshot || !context.targetOrgSlugSnapshot) {
      throw new Error("Target organization is required to create an access session");
    }

    return {
      staffEmailSnapshot: context.staffEmailSnapshot,
      staffRoleSnapshot: context.staffRoleSnapshot,
      staffUserId: context.staffUserId,
      targetOrgId: context.targetOrgId,
      targetOrgNameSnapshot: context.targetOrgNameSnapshot,
      targetOrgSlugSnapshot: context.targetOrgSlugSnapshot,
    };
  }

  private async insertAccessSession(
    db: ArgosDb,
    input: {
      reason: string;
      expiresAt: Date;
    },
    context: PlatformAccessContext,
  ) {
    const [session] = await db
      .insert(platformAccessSessionsTable)
      .values({
        staffUserId: context.staffUserId,
        targetOrgId: context.targetOrgId,
        staffEmailSnapshot: context.staffEmailSnapshot,
        staffRoleSnapshot: context.staffRoleSnapshot,
        targetOrgNameSnapshot: context.targetOrgNameSnapshot,
        targetOrgSlugSnapshot: context.targetOrgSlugSnapshot,
        reason: input.reason,
        status: "active",
        expiresAt: input.expiresAt,
      })
      .returning(accessSessionSelection);

    if (!session) {
      throw new Error("Failed to create platform access session");
    }

    return session;
  }

  async findActiveAccessSession(sessionId: string, staffUserId: string) {
    const [session] = await this.db
      .select({
        ...accessSessionSelection,
        targetOrgName: organizationsTable.name,
        targetOrgSlug: organizationsTable.slug,
        targetOrgWorkspaceTheme: organizationsTable.workspaceTheme,
      })
      .from(platformAccessSessionsTable)
      .leftJoin(organizationsTable, eq(platformAccessSessionsTable.targetOrgId, organizationsTable.id))
      .where(
        and(
          eq(platformAccessSessionsTable.id, sessionId),
          eq(platformAccessSessionsTable.staffUserId, staffUserId),
          eq(platformAccessSessionsTable.status, "active"),
          eq(organizationsTable.status, "active"),
          gt(platformAccessSessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return session
      ? {
          ...session,
          targetOrgWorkspaceTheme: coerceStoredWorkspaceTheme(
            session.targetOrgWorkspaceTheme,
          ),
        }
      : null;
  }

  async endAccessSession(sessionId: string, staffUserId: string, endedAt = new Date()) {
    const ended = await this.db
      .update(platformAccessSessionsTable)
      .set({
        status: "ended",
        endedAt,
      })
      .where(
        and(
          eq(platformAccessSessionsTable.id, sessionId),
          eq(platformAccessSessionsTable.staffUserId, staffUserId),
          eq(platformAccessSessionsTable.status, "active"),
        ),
      )
      .returning({ id: platformAccessSessionsTable.id });

    return ended.length > 0;
  }

  async createAuditEvent(input: {
    staffUserId?: string | null;
    targetOrgId?: string | null;
    sessionId?: string | null;
    staffEmailSnapshot?: string | null;
    staffRoleSnapshot?: PlatformStaffRole | null;
    targetOrgNameSnapshot?: string | null;
    targetOrgSlugSnapshot?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.insertAuditEvent(this.db, input);
  }

  private async insertAuditEvent(
    db: ArgosDb,
    input: {
      staffUserId?: string | null;
      targetOrgId?: string | null;
      sessionId?: string | null;
      staffEmailSnapshot?: string | null;
      staffRoleSnapshot?: PlatformStaffRole | null;
      targetOrgNameSnapshot?: string | null;
      targetOrgSlugSnapshot?: string | null;
      action: string;
      resourceType: string;
      resourceId?: string | null;
      reason: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const [event] = await db
      .insert(platformAuditEventsTable)
      .values({
        staffUserId: input.staffUserId ?? null,
        targetOrgId: input.targetOrgId ?? null,
        sessionId: input.sessionId ?? null,
        staffEmailSnapshot: input.staffEmailSnapshot ?? null,
        staffRoleSnapshot: input.staffRoleSnapshot ?? null,
        targetOrgNameSnapshot: input.targetOrgNameSnapshot ?? null,
        targetOrgSlugSnapshot: input.targetOrgSlugSnapshot ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        reason: input.reason,
        metadata: input.metadata ?? {},
      })
      .returning(auditEventSelection);

    if (!event) {
      throw new Error("Failed to create platform audit event");
    }

    return event;
  }

  async listOrganizations(input?: {
    query?: string;
    limit?: number;
    status?: "active" | "archived" | "all";
  }) {
    const limit = input?.limit ?? 50;
    const query = input?.query?.trim();
    const status = input?.status ?? "active";
    const conditions: SQL[] = [];

    if (status !== "all") {
      conditions.push(eq(organizationsTable.status, status));
    }

    if (query) {
      const queryCondition = or(
        ilike(organizationsTable.name, `%${query}%`),
        ilike(organizationsTable.slug, `%${query}%`),
      );

      if (queryCondition) {
        conditions.push(queryCondition);
      }
    }

    const whereCondition =
      conditions.length > 1
        ? and(...conditions)
        : conditions.length === 1
          ? conditions[0]
          : null;

    if (whereCondition) {
      return this.db
        .select(organizationSelection)
        .from(organizationsTable)
        .where(whereCondition)
        .orderBy(asc(organizationsTable.name))
        .limit(limit);
    }

    return this.db
      .select(organizationSelection)
      .from(organizationsTable)
      .orderBy(asc(organizationsTable.name))
      .limit(limit);
  }

  async getDashboardSnapshot(filters: PlatformDashboardFilters) {
    const organizations = await this.listDashboardOrganizations(filters);
    const organizationIds = organizations.map((organization) => organization.id);

    if (organizationIds.length === 0) {
      return buildPlatformDashboardSnapshot({
        filters,
        organizations: [],
      });
    }

    const [callRows, trainingRows, roleplayRows, billingRows] = await Promise.all([
      this.db
        .select({
          averageScore: sql<number | null>`round(avg(${callsTable.overallScore}) filter (where ${callsTable.status} = 'complete' and ${callsTable.overallScore} is not null))::int`,
          failedCalls: sql<number>`count(*) filter (where ${callsTable.status} = 'failed')::int`,
          lastCallAt: sql<Date | null>`max(${callsTable.createdAt})`,
          orgId: callsTable.orgId,
          processingCalls: sql<number>`count(*) filter (where ${callsTable.status} in ('uploaded', 'transcribing', 'evaluating'))::int`,
          reviewedCalls: sql<number>`count(*) filter (where ${callsTable.status} = 'complete')::int`,
          totalCalls: sql<number>`count(*)::int`,
        })
        .from(callsTable)
        .where(
          and(
            inArray(callsTable.orgId, organizationIds),
            gte(callsTable.createdAt, filters.from),
            lte(callsTable.createdAt, filters.to),
          ),
        )
        .groupBy(callsTable.orgId),
      this.db
        .select({
          completedTrainingAssignments: sql<number>`count(*) filter (where ${trainingProgressTable.status} = 'passed')::int`,
          orgId: trainingModulesTable.orgId,
          totalTrainingAssignments: sql<number>`count(${trainingProgressTable.id})::int`,
        })
        .from(trainingModulesTable)
        .leftJoin(trainingProgressTable, eq(trainingProgressTable.moduleId, trainingModulesTable.id))
        .where(inArray(trainingModulesTable.orgId, organizationIds))
        .groupBy(trainingModulesTable.orgId),
      this.db
        .select({
          lastRoleplayAt: sql<Date | null>`max(${roleplaySessionsTable.createdAt})`,
          orgId: roleplaySessionsTable.orgId,
          roleplaySessions: sql<number>`count(*)::int`,
        })
        .from(roleplaySessionsTable)
        .where(
          and(
            inArray(roleplaySessionsTable.orgId, organizationIds),
            gte(roleplaySessionsTable.createdAt, filters.from),
            lte(roleplaySessionsTable.createdAt, filters.to),
          ),
        )
        .groupBy(roleplaySessionsTable.orgId),
      this.db
        .select({
          activeSubscriptionCount: sql<number>`count(*) filter (where ${billingSubscriptionsTable.status} in ('active', 'trialing'))::int`,
          orgId: billingSubscriptionsTable.orgId,
          seats: sql<number>`coalesce(sum(${billingSubscriptionsTable.seatCount}) filter (where ${billingSubscriptionsTable.status} in ('active', 'trialing')), 0)::int`,
        })
        .from(billingSubscriptionsTable)
        .where(inArray(billingSubscriptionsTable.orgId, organizationIds))
        .groupBy(billingSubscriptionsTable.orgId),
    ]);

    const callMap = new Map(callRows.map((row) => [row.orgId, row]));
    const trainingMap = new Map(trainingRows.map((row) => [row.orgId, row]));
    const roleplayMap = new Map(roleplayRows.map((row) => [row.orgId, row]));
    const billingMap = new Map(billingRows.map((row) => [row.orgId, row]));

    const aggregates: PlatformDashboardOrganizationAggregate[] =
      organizations.map((organization) => {
        const callStats = callMap.get(organization.id);
        const trainingStats = trainingMap.get(organization.id);
        const roleplayStats = roleplayMap.get(organization.id);
        const billingStats = billingMap.get(organization.id);
        const lastActivityAt = getLatestDate([
          callStats?.lastCallAt ?? null,
          roleplayStats?.lastRoleplayAt ?? null,
        ]);

        return {
          activeSubscriptionCount: toNumber(billingStats?.activeSubscriptionCount),
          averageScore:
            callStats?.averageScore === null || callStats?.averageScore === undefined
              ? null
              : toNumber(callStats.averageScore),
          completedTrainingAssignments: toNumber(trainingStats?.completedTrainingAssignments),
          createdAt: organization.createdAt.toISOString(),
          failedCalls: toNumber(callStats?.failedCalls),
          id: organization.id,
          lastActivityAt: lastActivityAt?.toISOString() ?? null,
          name: organization.name,
          plan: organization.plan,
          processingCalls: toNumber(callStats?.processingCalls),
          reviewedCalls: toNumber(callStats?.reviewedCalls),
          seats: toNumber(billingStats?.seats),
          slug: organization.slug,
          totalCalls: toNumber(callStats?.totalCalls),
          totalTrainingAssignments: toNumber(trainingStats?.totalTrainingAssignments),
        };
      });

    return buildPlatformDashboardSnapshot({
      filters,
      organizations: aggregates,
    });
  }

  async listRecentAccessSessions(input?: { limit?: number }) {
    return this.db
      .select(accessSessionSelection)
      .from(platformAccessSessionsTable)
      .orderBy(desc(platformAccessSessionsTable.startedAt))
      .limit(input?.limit ?? 50);
  }

  private async listDashboardOrganizations(filters: PlatformDashboardFilters) {
    const query = filters.query.trim();
    const hasPlanFilter = filters.plan !== "all";
    const queryCondition = query
      ? or(
          ilike(organizationsTable.name, `%${query}%`),
          ilike(organizationsTable.slug, `%${query}%`),
        )
      : null;
    const planCondition = hasPlanFilter
      ? eq(organizationsTable.plan, filters.plan)
      : null;

    if (queryCondition && planCondition) {
      return this.db
        .select(organizationSelection)
        .from(organizationsTable)
        .where(and(queryCondition, planCondition, eq(organizationsTable.status, "active")))
        .orderBy(asc(organizationsTable.name));
    }

    if (queryCondition) {
      return this.db
        .select(organizationSelection)
        .from(organizationsTable)
        .where(and(queryCondition, eq(organizationsTable.status, "active")))
        .orderBy(asc(organizationsTable.name));
    }

    if (planCondition) {
      return this.db
        .select(organizationSelection)
        .from(organizationsTable)
        .where(and(planCondition, eq(organizationsTable.status, "active")))
        .orderBy(asc(organizationsTable.name));
    }

    return this.db
      .select(organizationSelection)
      .from(organizationsTable)
      .where(eq(organizationsTable.status, "active"))
      .orderBy(asc(organizationsTable.name));
  }

  async createOrganization(input: { name: string; slug: string; plan?: string }) {
    const [organization] = await this.db
      .insert(organizationsTable)
      .values({
        name: input.name,
        slug: input.slug,
        plan: input.plan ?? "trial",
      })
      .returning(organizationSelection);

    if (!organization) {
      throw new Error("Failed to create organization");
    }

    return organization;
  }

  async createOrganizationWithAdminInviteAndAudit(input: {
    name: string;
    slug: string;
    plan: string;
    adminEmail: string;
    inviteToken: string;
    inviteExpiresAt: Date;
    staffUserId: string;
    reason: string;
  }) {
    return this.db.transaction(async (tx) => {
      const transactionDb = tx as ArgosDb;
      const [organization] = await transactionDb
        .insert(organizationsTable)
        .values({
          name: input.name,
          slug: input.slug,
          plan: input.plan,
        })
        .returning(organizationSelection);

      if (!organization) {
        throw new Error("Failed to create organization");
      }

      const [invite] = await transactionDb
        .insert(invitesTable)
        .values({
          orgId: organization.id,
          email: input.adminEmail,
          role: "admin",
          token: input.inviteToken,
          teamIds: null,
          expiresAt: input.inviteExpiresAt,
        })
        .returning(inviteSelection);

      if (!invite) {
        throw new Error("Failed to create initial admin invite");
      }

      const auditEvent = await this.insertAuditEvent(transactionDb, {
        staffUserId: input.staffUserId,
        targetOrgId: organization.id,
        targetOrgNameSnapshot: organization.name,
        targetOrgSlugSnapshot: organization.slug,
        action: "platform.organization.create",
        resourceType: "organization",
        resourceId: organization.id,
        reason: input.reason,
        metadata: {
          initialAdminEmail: input.adminEmail,
          inviteId: invite.id,
          plan: organization.plan,
          slug: organization.slug,
        },
      });

      return {
        auditEvent,
        invite,
        organization,
      };
    });
  }

  async findOrganizationBySlug(slug: string) {
    const [organization] = await this.db
      .select(organizationSelection)
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug))
      .limit(1);

    return organization ?? null;
  }

  async findOrganizationForArchive(orgId: string) {
    const [organization] = await this.db
      .select(organizationSelection)
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);

    return organization ?? null;
  }

  async archiveOrganizationWithAudit(input: {
    action: "organization.archive" | "platform.organization.archive";
    archivedAt: Date;
    archivedBy: string;
    actor: {
      email?: string | null;
      kind: "organization" | "platform";
      role: AppUserRole | PlatformStaffRole;
      userId: string;
    };
    metadata: Record<string, unknown>;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    reason: string;
  }) {
    return this.db.transaction(async (tx) => {
      const transactionDb = tx as ArgosDb;
      const [organization] = await transactionDb
        .update(organizationsTable)
        .set({
          archiveReason: input.reason,
          archivedAt: input.archivedAt,
          archivedBy: input.archivedBy,
          status: "archived",
        })
        .where(
          and(
            eq(organizationsTable.id, input.organization.id),
            eq(organizationsTable.status, "active"),
          ),
        )
        .returning(organizationSelection);

      if (!organization) {
        throw new Error("Failed to archive organization");
      }

      const detachedUsers = await transactionDb
        .update(usersTable)
        .set({
          orgId: null,
          role: null,
          updatedAt: input.archivedAt,
        })
        .where(eq(usersTable.orgId, input.organization.id))
        .returning({ id: usersTable.id });

      const endedSessions = await transactionDb
        .update(platformAccessSessionsTable)
        .set({
          endedAt: input.archivedAt,
          status: "ended",
        })
        .where(
          and(
            eq(platformAccessSessionsTable.targetOrgId, input.organization.id),
            eq(platformAccessSessionsTable.status, "active"),
          ),
        )
        .returning({ id: platformAccessSessionsTable.id });

      const detachedUserCount = detachedUsers.length;
      const endedSessionCount = endedSessions.length;
      const auditEvent = await this.insertAuditEvent(transactionDb, {
        staffUserId: input.actor.kind === "platform" ? input.actor.userId : null,
        targetOrgId: input.organization.id,
        staffEmailSnapshot: input.actor.kind === "platform" ? input.actor.email ?? null : null,
        staffRoleSnapshot:
          input.actor.kind === "platform" ? (input.actor.role as PlatformStaffRole) : null,
        targetOrgNameSnapshot: input.organization.name,
        targetOrgSlugSnapshot: input.organization.slug,
        action: input.action,
        resourceType: "organization",
        resourceId: input.organization.id,
        reason: input.reason,
        metadata: {
          ...input.metadata,
          detachedUserCount,
          endedSessionCount,
          targetOrgName: input.organization.name,
          targetOrgSlug: input.organization.slug,
        },
      });

      return {
        archived: true as const,
        auditEvent,
        detachedUserCount,
        endedSessionCount,
        organization,
      };
    });
  }

  async getOrganizationDetailSnapshot(slug: string) {
    const organization = await this.findOrganizationBySlug(slug);

    if (!organization) {
      return null;
    }

    const [
      members,
      invites,
      callRows,
      trainingRows,
      roleplayRows,
      billingSubscriptions,
      accessSessions,
    ] = await Promise.all([
      this.db
        .select({
          email: usersTable.email,
          id: usersTable.id,
          role: usersTable.role,
        })
        .from(usersTable)
        .where(eq(usersTable.orgId, organization.id))
        .orderBy(asc(usersTable.email)),
      this.db
        .select(inviteSelection)
        .from(invitesTable)
        .where(eq(invitesTable.orgId, organization.id))
        .orderBy(desc(invitesTable.createdAt))
        .limit(10),
      this.db
        .select({
          averageScore: sql<number | null>`round(avg(${callsTable.overallScore}) filter (where ${callsTable.status} = 'complete' and ${callsTable.overallScore} is not null))::int`,
          failedCalls: sql<number>`count(*) filter (where ${callsTable.status} = 'failed')::int`,
          lastCallAt: sql<Date | null>`max(${callsTable.createdAt})`,
          processingCalls: sql<number>`count(*) filter (where ${callsTable.status} in ('uploaded', 'transcribing', 'evaluating'))::int`,
          reviewedCalls: sql<number>`count(*) filter (where ${callsTable.status} = 'complete')::int`,
          totalCalls: sql<number>`count(*)::int`,
        })
        .from(callsTable)
        .where(eq(callsTable.orgId, organization.id)),
      this.db
        .select({
          completedTrainingAssignments: sql<number>`count(*) filter (where ${trainingProgressTable.status} = 'passed')::int`,
          totalTrainingAssignments: sql<number>`count(${trainingProgressTable.id})::int`,
        })
        .from(trainingModulesTable)
        .leftJoin(trainingProgressTable, eq(trainingProgressTable.moduleId, trainingModulesTable.id))
        .where(eq(trainingModulesTable.orgId, organization.id)),
      this.db
        .select({
          lastRoleplayAt: sql<Date | null>`max(${roleplaySessionsTable.createdAt})`,
          roleplaySessions: sql<number>`count(*)::int`,
        })
        .from(roleplaySessionsTable)
        .where(eq(roleplaySessionsTable.orgId, organization.id)),
      this.db
        .select({
          seatCount: billingSubscriptionsTable.seatCount,
          status: billingSubscriptionsTable.status,
          stripeCustomerId: billingSubscriptionsTable.stripeCustomerId,
          stripeSubscriptionId: billingSubscriptionsTable.stripeSubscriptionId,
        })
        .from(billingSubscriptionsTable)
        .where(eq(billingSubscriptionsTable.orgId, organization.id))
        .orderBy(desc(billingSubscriptionsTable.createdAt)),
      this.db
        .select(accessSessionSelection)
        .from(platformAccessSessionsTable)
        .where(eq(platformAccessSessionsTable.targetOrgId, organization.id))
        .orderBy(desc(platformAccessSessionsTable.startedAt))
        .limit(10),
    ]);
    const auditEvents = await this.listAuditEvents({ targetOrgId: organization.id, limit: 10 });

    const callStats = callRows[0];
    const trainingStats = trainingRows[0];
    const roleplayStats = roleplayRows[0];

    return buildPlatformOrganizationDetailSnapshot({
      accessSessions: accessSessions.map((session) => ({
        endedAt: session.endedAt?.toISOString() ?? null,
        expiresAt: session.expiresAt.toISOString(),
        id: session.id,
        reason: session.reason,
        staffEmailSnapshot: session.staffEmailSnapshot ?? "unknown",
        startedAt: session.startedAt.toISOString(),
        status: session.status,
      })),
      auditEvents,
      billingSubscriptions: billingSubscriptions.map((subscription) => ({
        seatCount: toNumber(subscription.seatCount),
        status: subscription.status,
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      })),
      callStats: {
        averageScore:
          callStats?.averageScore === null || callStats?.averageScore === undefined
            ? null
            : toNumber(callStats.averageScore),
        failedCalls: toNumber(callStats?.failedCalls),
        lastCallAt: callStats?.lastCallAt?.toISOString() ?? null,
        processingCalls: toNumber(callStats?.processingCalls),
        reviewedCalls: toNumber(callStats?.reviewedCalls),
        totalCalls: toNumber(callStats?.totalCalls),
      },
      invites: invites.map((invite) => ({
        acceptedAt: invite.acceptedAt?.toISOString() ?? null,
        createdAt: invite.createdAt.toISOString(),
        email: invite.email,
        expiresAt: invite.expiresAt.toISOString(),
        id: invite.id,
        role: invite.role,
      })),
      members,
      organization: {
        createdAt: organization.createdAt.toISOString(),
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        slug: organization.slug,
      },
      roleplayStats: {
        lastRoleplayAt: roleplayStats?.lastRoleplayAt?.toISOString() ?? null,
        roleplaySessions: toNumber(roleplayStats?.roleplaySessions),
      },
      trainingStats: {
        completedTrainingAssignments: toNumber(trainingStats?.completedTrainingAssignments),
        totalTrainingAssignments: toNumber(trainingStats?.totalTrainingAssignments),
      },
    });
  }

  async listAuditEvents(input?: { limit?: number; targetOrgId?: string }) {
    const limit = input?.limit ?? 50;

    if (input?.targetOrgId) {
      const events = await this.db
        .select(auditEventSelection)
        .from(platformAuditEventsTable)
        .where(eq(platformAuditEventsTable.targetOrgId, input.targetOrgId))
        .orderBy(desc(platformAuditEventsTable.createdAt))
        .limit(limit);

      return events.map(serializeAuditEvent);
    }

    const events = await this.db
      .select(auditEventSelection)
      .from(platformAuditEventsTable)
      .orderBy(desc(platformAuditEventsTable.createdAt))
      .limit(limit);

    return events.map(serializeAuditEvent);
  }
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function getLatestDate(values: Array<Date | string | null>) {
  const dates = values
    .filter((value): value is Date | string => Boolean(value))
    .map((value) => (value instanceof Date ? value : new Date(value)))
    .filter((value) => !Number.isNaN(value.getTime()));

  if (!dates.length) {
    return null;
  }

  return dates.sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

function serializeAuditEvent(event: {
  action: string;
  createdAt: Date;
  id: string;
  reason: string;
  resourceType: string;
  staffEmailSnapshot: string | null;
}) {
  return {
    action: event.action,
    createdAt: event.createdAt.toISOString(),
    id: event.id,
    reason: event.reason,
    resourceType: event.resourceType,
    staffEmailSnapshot: event.staffEmailSnapshot,
  };
}
