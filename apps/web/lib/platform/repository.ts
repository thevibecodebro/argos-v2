import { and, asc, desc, eq, gt, ilike, or } from "drizzle-orm";
import {
  getDb,
  invitesTable,
  organizationsTable,
  platformAccessSessionsTable,
  platformAuditEventsTable,
  platformStaffTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";

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
  id: organizationsTable.id,
  name: organizationsTable.name,
  slug: organizationsTable.slug,
  plan: organizationsTable.plan,
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
      })
      .from(platformAccessSessionsTable)
      .leftJoin(organizationsTable, eq(platformAccessSessionsTable.targetOrgId, organizationsTable.id))
      .where(
        and(
          eq(platformAccessSessionsTable.id, sessionId),
          eq(platformAccessSessionsTable.staffUserId, staffUserId),
          eq(platformAccessSessionsTable.status, "active"),
          gt(platformAccessSessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return session ?? null;
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

  async listOrganizations(input?: { query?: string; limit?: number }) {
    const limit = input?.limit ?? 50;
    const query = input?.query?.trim();

    if (query) {
      return this.db
        .select(organizationSelection)
        .from(organizationsTable)
        .where(
          or(
            ilike(organizationsTable.name, `%${query}%`),
            ilike(organizationsTable.slug, `%${query}%`),
          ),
        )
        .orderBy(asc(organizationsTable.name))
        .limit(limit);
    }

    return this.db
      .select(organizationSelection)
      .from(organizationsTable)
      .orderBy(asc(organizationsTable.name))
      .limit(limit);
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
}
