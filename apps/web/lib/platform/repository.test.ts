import { and, eq, gt } from "drizzle-orm";
import {
  platformAccessSessionsTable,
  platformStaffTable,
} from "@argos-v2/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parsePlatformDashboardFilters } from "./dashboard";
import { DrizzlePlatformRepository } from "./repository";

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();

  return {
    ...actual,
    and: vi.fn((...conditions: unknown[]) => ({ conditions, op: "and" })),
    eq: vi.fn((left: unknown, right: unknown) => ({ left, op: "eq", right })),
    gt: vi.fn((left: unknown, right: unknown) => ({ left, op: "gt", right })),
  };
});

type Operation =
  | {
      kind: "insert";
      table: unknown;
      values?: unknown;
      conflict?: unknown;
      returning?: unknown;
    }
  | {
      kind: "select";
      selection?: unknown;
      from?: unknown;
      joins: unknown[];
      whereArgs: unknown[];
      whereCount: number;
      orderCount: number;
      groupCount: number;
      limitValue?: number;
    }
  | {
      kind: "update";
      table: unknown;
      set?: Record<string, unknown>;
      whereArgs: unknown[];
      whereCount: number;
      returning?: unknown;
    }
  | {
      kind: "transaction";
    };

function createRepositoryHarness(results: unknown[][] = []) {
  const operations: Operation[] = [];
  const queuedResults = [...results];

  function nextResult() {
    return queuedResults.shift() ?? [];
  }

  function createSelectBuilder(selection: unknown) {
    const operation: Operation = {
      kind: "select",
      selection,
      joins: [],
      whereArgs: [],
      whereCount: 0,
      orderCount: 0,
      groupCount: 0,
    };
    operations.push(operation);

    const builder = {
      from(table: unknown) {
        operation.from = table;
        return builder;
      },
      leftJoin(table: unknown) {
        operation.joins.push(table);
        return builder;
      },
      where(...args: unknown[]) {
        operation.whereArgs.push(...args);
        operation.whereCount += 1;
        return builder;
      },
      orderBy() {
        operation.orderCount += 1;
        return builder;
      },
      groupBy() {
        operation.groupCount += 1;
        return builder;
      },
      limit(value: number) {
        operation.limitValue = value;
        return builder;
      },
      then(resolve: (rows: unknown[]) => unknown, reject?: (reason: unknown) => unknown) {
        return Promise.resolve(nextResult()).then(resolve, reject);
      },
    };

    return builder;
  }

  function createInsertBuilder(table: unknown) {
    const operation: Operation = { kind: "insert", table };
    operations.push(operation);

    const builder = {
      values(values: unknown) {
        operation.values = values;
        return builder;
      },
      onConflictDoUpdate(conflict: unknown) {
        operation.conflict = conflict;
        return builder;
      },
      returning(returning: unknown) {
        operation.returning = returning;
        return Promise.resolve(nextResult());
      },
      then(resolve: (rows: unknown[]) => unknown, reject?: (reason: unknown) => unknown) {
        return Promise.resolve(nextResult()).then(resolve, reject);
      },
    };

    return builder;
  }

  function createUpdateBuilder(table: unknown) {
    const operation: Operation = {
      kind: "update",
      table,
      whereArgs: [],
      whereCount: 0,
    };
    operations.push(operation);

    const builder = {
      set(set: Record<string, unknown>) {
        operation.set = set;
        return builder;
      },
      where(...args: unknown[]) {
        operation.whereArgs.push(...args);
        operation.whereCount += 1;
        return builder;
      },
      returning(returning: unknown) {
        operation.returning = returning;
        return Promise.resolve(nextResult());
      },
    };

    return builder;
  }

  const db = {
    select: vi.fn(createSelectBuilder),
    insert: vi.fn(createInsertBuilder),
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => {
      operations.push({ kind: "transaction" });
      return callback(db);
    }),
    update: vi.fn(createUpdateBuilder),
  };

  return {
    db,
    operations,
    repository: new DrizzlePlatformRepository(db as never),
  };
}

describe("DrizzlePlatformRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds a platform staff record by user id", async () => {
    const createdAt = new Date("2026-06-11T10:00:00.000Z");
    const updatedAt = new Date("2026-06-11T10:05:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [
        {
          userId: "user-1",
          role: "owner",
          status: "active",
          createdBy: "user-0",
          revokedBy: null,
          createdAt,
          updatedAt,
          revokedAt: null,
        },
      ],
    ]);

    await expect(repository.findStaffByUserId("user-1")).resolves.toEqual({
      userId: "user-1",
      role: "owner",
      status: "active",
      createdBy: "user-0",
      revokedBy: null,
      createdAt,
      updatedAt,
      revokedAt: null,
    });
    expect(operations).toMatchObject([{ kind: "select", whereCount: 1, limitValue: 1 }]);
  });

  it("returns null when no platform staff record exists", async () => {
    const { repository } = createRepositoryHarness([[]]);

    await expect(repository.findStaffByUserId("missing-user")).resolves.toBeNull();
  });

  it("upserts active platform staff and returns the saved record", async () => {
    const createdAt = new Date("2026-06-11T10:00:00.000Z");
    const updatedAt = new Date("2026-06-11T10:05:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [
        {
          userId: "staff-1",
          role: "operator",
          status: "active",
          createdBy: "owner-1",
          revokedBy: null,
          createdAt,
          updatedAt,
          revokedAt: null,
        },
      ],
    ]);

    await expect(
      repository.upsertStaff({
        userId: "staff-1",
        role: "operator",
        createdBy: "owner-1",
      }),
    ).resolves.toMatchObject({
      userId: "staff-1",
      role: "operator",
      status: "active",
      createdBy: "owner-1",
      revokedBy: null,
      revokedAt: null,
    });

    expect(operations[0]).toMatchObject({
      kind: "insert",
      values: {
        userId: "staff-1",
        role: "operator",
        status: "active",
        createdBy: "owner-1",
        revokedBy: null,
        revokedAt: null,
      },
    });
    expect((operations[0] as Extract<Operation, { kind: "insert" }>).conflict).toBeTruthy();
  });

  it("revokes platform staff with revocation actor and timestamp", async () => {
    const revokedAt = new Date("2026-06-11T11:00:00.000Z");
    const { operations, repository } = createRepositoryHarness([[{ userId: "staff-1" }]]);

    await expect(
      repository.revokeStaff({
        userId: "staff-1",
        revokedBy: "owner-1",
        revokedAt,
      }),
    ).resolves.toBe(true);

    expect(operations[0]).toMatchObject({
      kind: "update",
      set: {
        status: "revoked",
        revokedBy: "owner-1",
        revokedAt,
      },
      whereCount: 1,
    });
  });

  it("lists platform staff with user email details", async () => {
    const createdAt = new Date("2026-06-11T10:00:00.000Z");
    const updatedAt = new Date("2026-06-11T10:05:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [
        {
          userId: "staff-1",
          role: "owner",
          status: "active",
          createdBy: null,
          revokedBy: null,
          createdAt,
          updatedAt,
          revokedAt: null,
          email: "owner@example.com",
        },
      ],
    ]);

    await expect(repository.listStaff()).resolves.toEqual([
      {
        userId: "staff-1",
        role: "owner",
        status: "active",
        createdBy: null,
        revokedBy: null,
        createdAt,
        updatedAt,
        revokedAt: null,
        email: "owner@example.com",
      },
    ]);
    expect(operations[0]).toMatchObject({ kind: "select", joins: expect.any(Array), orderCount: 1 });
  });

  it("loads platform dashboard organizations without a hard result cap", async () => {
    const createdAt = new Date("2026-06-11T10:00:00.000Z");
    const filters = parsePlatformDashboardFilters(
      {
        plan: "enterprise",
        q: "acme",
      },
      new Date("2026-06-16T10:00:00.000Z"),
    );
    const { operations, repository } = createRepositoryHarness([
      [
        {
          id: "org-1",
          name: "Acme",
          slug: "acme",
          plan: "enterprise",
          createdAt,
        },
      ],
      [],
      [],
      [],
      [],
    ]);

    await expect(repository.getDashboardSnapshot(filters)).resolves.toMatchObject({
      summary: {
        totalOrganizations: 1,
      },
    });

    expect(operations[0]).toMatchObject({
      kind: "select",
      orderCount: 1,
      whereCount: 1,
    });
    expect((operations[0] as Extract<Operation, { kind: "select" }>).limitValue).toBeUndefined();
    expect(
      operations.some(
        (operation) =>
          operation.kind === "select" && operation.limitValue !== undefined,
      ),
    ).toBe(false);
  });

  it("finds an orgless platform user candidate by email", async () => {
    const { operations, repository } = createRepositoryHarness([
      [{ id: "user-1", email: "operator@argos.test", orgId: null }],
    ]);

    await expect(repository.findUserByEmail("operator@argos.test")).resolves.toEqual({
      id: "user-1",
      email: "operator@argos.test",
      orgId: null,
    });
    expect(operations[0]).toMatchObject({ kind: "select", whereCount: 1, limitValue: 1 });
  });

  it("creates active audited org-switch sessions", async () => {
    const startedAt = new Date("2026-06-11T12:00:00.000Z");
    const expiresAt = new Date("2026-06-11T13:00:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [
        {
          staffUserId: "staff-1",
          staffEmailSnapshot: "staff@example.com",
          staffRoleSnapshot: "operator",
          targetOrgId: "org-1",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
        },
      ],
      [
        {
          id: "session-1",
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          staffEmailSnapshot: "staff@example.com",
          staffRoleSnapshot: "operator",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
          reason: "Support request",
          status: "active",
          startedAt,
          expiresAt,
          endedAt: null,
        },
      ],
    ]);

    await expect(
      repository.createAccessSession({
        staffUserId: "staff-1",
        targetOrgId: "org-1",
        reason: "Support request",
        expiresAt,
      }),
    ).resolves.toMatchObject({
      id: "session-1",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
      status: "active",
      expiresAt,
      staffEmailSnapshot: "staff@example.com",
      staffRoleSnapshot: "operator",
      targetOrgNameSnapshot: "Acme",
      targetOrgSlugSnapshot: "acme",
    });
    expect(eq).toHaveBeenCalledWith(platformStaffTable.status, "active");
    expect(operations[0]).toMatchObject({
      kind: "select",
      whereCount: 1,
      limitValue: 1,
    });
    expect(operations[1]).toMatchObject({
      kind: "insert",
      values: {
        staffUserId: "staff-1",
        targetOrgId: "org-1",
        staffEmailSnapshot: "staff@example.com",
        staffRoleSnapshot: "operator",
        targetOrgNameSnapshot: "Acme",
        targetOrgSlugSnapshot: "acme",
        reason: "Support request",
        status: "active",
        expiresAt,
      },
    });
  });

  it("rejects org-switch session creation when platform staff is not active", async () => {
    const expiresAt = new Date("2026-06-11T13:00:00.000Z");
    const { db, repository } = createRepositoryHarness([[]]);

    await expect(
      repository.createAccessSession({
        staffUserId: "staff-1",
        targetOrgId: "org-1",
        reason: "Support request",
        expiresAt,
      }),
    ).rejects.toThrow("Active platform staff is required to create an access session");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates an org-switch session and audit event atomically with snapshots", async () => {
    const startedAt = new Date("2026-06-11T12:00:00.000Z");
    const expiresAt = new Date("2026-06-11T13:00:00.000Z");
    const createdAt = new Date("2026-06-11T12:00:01.000Z");
    const { db, operations, repository } = createRepositoryHarness([
      [
        {
          staffUserId: "staff-1",
          staffEmailSnapshot: "staff@example.com",
          staffRoleSnapshot: "owner",
          targetOrgId: "org-1",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
        },
      ],
      [
        {
          id: "session-1",
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          staffEmailSnapshot: "staff@example.com",
          staffRoleSnapshot: "owner",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
          reason: "Support request",
          status: "active",
          startedAt,
          expiresAt,
          endedAt: null,
        },
      ],
      [
        {
          id: "audit-1",
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          sessionId: "session-1",
          staffEmailSnapshot: "staff@example.com",
          staffRoleSnapshot: "owner",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
          action: "platform.access_session.created",
          resourceType: "organization",
          resourceId: "org-1",
          reason: "Support request",
          metadata: { ticketId: "T-1" },
          createdAt,
        },
      ],
    ]);

    await expect(
      repository.createAccessSessionWithAuditEvent({
        staffUserId: "staff-1",
        targetOrgId: "org-1",
        reason: "Support request",
        expiresAt,
        audit: {
          action: "platform.access_session.created",
          resourceType: "organization",
          resourceId: "org-1",
          metadata: { ticketId: "T-1" },
        },
      }),
    ).resolves.toMatchObject({
      auditEvent: {
        id: "audit-1",
        sessionId: "session-1",
        staffEmailSnapshot: "staff@example.com",
        targetOrgSlugSnapshot: "acme",
      },
      session: {
        id: "session-1",
        staffEmailSnapshot: "staff@example.com",
        targetOrgNameSnapshot: "Acme",
      },
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(operations.map((operation) => operation.kind)).toEqual([
      "transaction",
      "select",
      "insert",
      "insert",
    ]);
    expect(operations[2]).toMatchObject({
      kind: "insert",
      values: {
        staffEmailSnapshot: "staff@example.com",
        staffRoleSnapshot: "owner",
        targetOrgNameSnapshot: "Acme",
        targetOrgSlugSnapshot: "acme",
      },
    });
    expect(operations[3]).toMatchObject({
      kind: "insert",
      values: {
        sessionId: "session-1",
        staffEmailSnapshot: "staff@example.com",
        staffRoleSnapshot: "owner",
        targetOrgNameSnapshot: "Acme",
        targetOrgSlugSnapshot: "acme",
      },
    });
  });

  it("finds only active, unexpired org-switch sessions with target organization details", async () => {
    const startedAt = new Date("2026-06-11T12:00:00.000Z");
    const expiresAt = new Date("2026-06-11T13:00:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [
        {
          id: "session-1",
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          staffEmailSnapshot: "staff@example.com",
          staffRoleSnapshot: "operator",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
          reason: "Support request",
          status: "active",
          startedAt,
          expiresAt,
          endedAt: null,
          targetOrgName: "Acme",
          targetOrgSlug: "acme",
        },
      ],
    ]);

    await expect(repository.findActiveAccessSession("session-1", "staff-1")).resolves.toEqual({
      id: "session-1",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
      reason: "Support request",
      status: "active",
      startedAt,
      expiresAt,
      endedAt: null,
      staffEmailSnapshot: "staff@example.com",
      staffRoleSnapshot: "operator",
      targetOrgNameSnapshot: "Acme",
      targetOrgSlugSnapshot: "acme",
      targetOrgName: "Acme",
      targetOrgSlug: "acme",
    });
    expect(eq).toHaveBeenCalledWith(platformAccessSessionsTable.id, "session-1");
    expect(eq).toHaveBeenCalledWith(platformAccessSessionsTable.staffUserId, "staff-1");
    expect(eq).toHaveBeenCalledWith(platformAccessSessionsTable.status, "active");
    expect(gt).toHaveBeenCalledWith(platformAccessSessionsTable.expiresAt, expect.any(Date));
    expect(and).toHaveBeenCalledWith(
      { left: platformAccessSessionsTable.id, op: "eq", right: "session-1" },
      { left: platformAccessSessionsTable.staffUserId, op: "eq", right: "staff-1" },
      { left: platformAccessSessionsTable.status, op: "eq", right: "active" },
      { left: platformAccessSessionsTable.expiresAt, op: "gt", right: expect.any(Date) },
    );
    expect(operations[0]).toMatchObject({
      kind: "select",
      joins: expect.any(Array),
      whereArgs: [
        {
          conditions: [
            { left: platformAccessSessionsTable.id, op: "eq", right: "session-1" },
            { left: platformAccessSessionsTable.staffUserId, op: "eq", right: "staff-1" },
            { left: platformAccessSessionsTable.status, op: "eq", right: "active" },
            { left: platformAccessSessionsTable.expiresAt, op: "gt", right: expect.any(Date) },
          ],
          op: "and",
        },
      ],
      limitValue: 1,
    });
  });

  it("marks an org-switch session ended for the owning staff user", async () => {
    const endedAt = new Date("2026-06-11T12:30:00.000Z");
    const { operations, repository } = createRepositoryHarness([[{ id: "session-1" }]]);

    await expect(
      repository.endAccessSession("session-1", "staff-1", endedAt),
    ).resolves.toBe(true);
    expect(operations[0]).toMatchObject({
      kind: "update",
      set: {
        status: "ended",
        endedAt,
      },
      whereCount: 1,
    });
  });

  it("creates platform audit events with metadata defaulting to an object", async () => {
    const createdAt = new Date("2026-06-11T12:45:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [
        {
          id: "audit-1",
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          sessionId: "session-1",
          staffEmailSnapshot: "staff@example.com",
          staffRoleSnapshot: "operator",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
          action: "organization.viewed",
          resourceType: "organization",
          resourceId: "org-1",
          reason: "Support request",
          metadata: {},
          createdAt,
        },
      ],
    ]);

    await expect(
      repository.createAuditEvent({
        staffUserId: "staff-1",
        targetOrgId: "org-1",
        sessionId: "session-1",
        action: "organization.viewed",
        resourceType: "organization",
        resourceId: "org-1",
        reason: "Support request",
        staffEmailSnapshot: "staff@example.com",
        staffRoleSnapshot: "operator",
        targetOrgNameSnapshot: "Acme",
        targetOrgSlugSnapshot: "acme",
      }),
    ).resolves.toMatchObject({
      id: "audit-1",
      action: "organization.viewed",
      staffEmailSnapshot: "staff@example.com",
      targetOrgNameSnapshot: "Acme",
      metadata: {},
    });
    expect(operations[0]).toMatchObject({
      kind: "insert",
      values: {
        staffUserId: "staff-1",
        targetOrgId: "org-1",
        sessionId: "session-1",
        action: "organization.viewed",
        resourceType: "organization",
        resourceId: "org-1",
        reason: "Support request",
        staffEmailSnapshot: "staff@example.com",
        staffRoleSnapshot: "operator",
        targetOrgNameSnapshot: "Acme",
        targetOrgSlugSnapshot: "acme",
        metadata: {},
      },
    });
  });

  it("lists organizations as platform summaries", async () => {
    const createdAt = new Date("2026-06-11T09:00:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [{ id: "org-1", name: "Acme", slug: "acme", plan: "trial", createdAt }],
    ]);

    await expect(repository.listOrganizations({ query: "acme", limit: 10 })).resolves.toEqual([
      { id: "org-1", name: "Acme", slug: "acme", plan: "trial", createdAt },
    ]);
    expect(operations[0]).toMatchObject({ kind: "select", whereCount: 1, orderCount: 1, limitValue: 10 });
  });

  it("creates organizations and finds them by slug", async () => {
    const createdAt = new Date("2026-06-11T09:00:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [{ id: "org-1", name: "Acme", slug: "acme", plan: "pro", createdAt }],
      [{ id: "org-1", name: "Acme", slug: "acme", plan: "pro", createdAt }],
    ]);

    await expect(
      repository.createOrganization({ name: "Acme", slug: "acme", plan: "pro" }),
    ).resolves.toEqual({ id: "org-1", name: "Acme", slug: "acme", plan: "pro", createdAt });
    await expect(repository.findOrganizationBySlug("acme")).resolves.toEqual({
      id: "org-1",
      name: "Acme",
      slug: "acme",
      plan: "pro",
      createdAt,
    });
    expect(operations[0]).toMatchObject({
      kind: "insert",
      values: { name: "Acme", slug: "acme", plan: "pro" },
    });
    expect(operations[1]).toMatchObject({ kind: "select", whereCount: 1, limitValue: 1 });
  });

  it("creates a platform organization, initial admin invite, and audit event in one transaction", async () => {
    const createdAt = new Date("2026-06-11T09:00:00.000Z");
    const expiresAt = new Date("2026-06-18T09:00:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [{ id: "org-1", name: "Acme", slug: "acme", plan: "team", createdAt }],
      [
        {
          id: "invite-1",
          orgId: "org-1",
          email: "admin@acme.com",
          role: "admin",
          token: "invite-token-1",
          teamIds: null,
          expiresAt,
          acceptedAt: null,
          createdAt,
        },
      ],
      [
        {
          id: "audit-1",
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          sessionId: null,
          staffEmailSnapshot: null,
          staffRoleSnapshot: null,
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
          action: "platform.organization.create",
          resourceType: "organization",
          resourceId: "org-1",
          reason: "Customer onboarding request",
          metadata: {
            initialAdminEmail: "admin@acme.com",
            inviteId: "invite-1",
            plan: "team",
            slug: "acme",
          },
          createdAt,
        },
      ],
    ]);

    await expect(
      repository.createOrganizationWithAdminInviteAndAudit({
        adminEmail: "admin@acme.com",
        inviteExpiresAt: expiresAt,
        inviteToken: "invite-token-1",
        name: "Acme",
        plan: "team",
        reason: "Customer onboarding request",
        slug: "acme",
        staffUserId: "staff-1",
      }),
    ).resolves.toMatchObject({
      auditEvent: {
        id: "audit-1",
        action: "platform.organization.create",
        targetOrgId: "org-1",
      },
      invite: {
        id: "invite-1",
        email: "admin@acme.com",
        role: "admin",
      },
      organization: {
        id: "org-1",
        slug: "acme",
      },
    });

    expect(operations).toMatchObject([
      { kind: "transaction" },
      { kind: "insert", values: { name: "Acme", slug: "acme", plan: "team" } },
      {
        kind: "insert",
        values: {
          orgId: "org-1",
          email: "admin@acme.com",
          role: "admin",
          token: "invite-token-1",
          teamIds: null,
          expiresAt,
        },
      },
      {
        kind: "insert",
        values: {
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
          action: "platform.organization.create",
          resourceType: "organization",
          resourceId: "org-1",
          reason: "Customer onboarding request",
          metadata: {
            initialAdminEmail: "admin@acme.com",
            inviteId: "invite-1",
            plan: "team",
            slug: "acme",
          },
        },
      },
    ]);
  });

  it("loads an organization detail snapshot by slug", async () => {
    const createdAt = new Date("2026-06-01T15:00:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [{ id: "org-1", name: "Acme Health", slug: "acme-health", plan: "trial", createdAt }],
      [{ id: "user-1", email: "admin@acme.test", role: "admin" }],
      [],
      [{ averageScore: 82, failedCalls: 0, lastCallAt: createdAt, processingCalls: 0, reviewedCalls: 4, totalCalls: 4 }],
      [{ completedTrainingAssignments: 0, totalTrainingAssignments: 0 }],
      [{ lastRoleplayAt: null, roleplaySessions: 0 }],
      [{ seatCount: 4, status: "trialing", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" }],
      [],
      [],
    ]);

    const snapshot = await repository.getOrganizationDetailSnapshot("acme-health");

    expect(snapshot?.organization.slug).toBe("acme-health");
    expect(snapshot?.summary.admins).toBe(1);
    expect(snapshot?.billing.seats).toBe(4);
    expect(operations.filter((operation) => operation.kind === "select")).toHaveLength(9);
  });

  it("returns null when organization detail slug is missing", async () => {
    const { repository } = createRepositoryHarness([[]]);

    await expect(repository.getOrganizationDetailSnapshot("missing")).resolves.toBeNull();
  });

  it("lists platform audit events with an optional organization filter", async () => {
    const createdAt = new Date("2026-06-16T15:00:00.000Z");
    const { operations, repository } = createRepositoryHarness([
      [
        {
          action: "platform.organization.create",
          createdAt,
          id: "event-1",
          reason: "Customer launch",
          resourceType: "organization",
          staffEmailSnapshot: "owner@argos.test",
        },
      ],
    ]);

    await expect(
      repository.listAuditEvents({ targetOrgId: "org-1", limit: 25 }),
    ).resolves.toHaveLength(1);
    expect(operations[0]).toMatchObject({ kind: "select", limitValue: 25, whereCount: 1 });
  });
});
