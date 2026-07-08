import { beforeEach, describe, expect, it, vi } from "vitest";

const { and, count, eq, or } = vi.hoisted(() => ({
  and: vi.fn((...conditions) => ({ op: "and", conditions })),
  count: vi.fn((column) => ({ op: "count", column })),
  eq: vi.fn((left, right) => ({ op: "eq", left, right })),
  or: vi.fn((...conditions) => ({ op: "or", conditions })),
}));

const tables = vi.hoisted(() => {
  function table(name: string, columns: string[]) {
    return Object.fromEntries([
      ["__name", name],
      ...columns.map((column) => [column, `${name}.${column}`]),
    ]);
  }

  return {
    auditEventsTable: table("audit_events", [
      "actorId",
      "eventType",
      "metadata",
      "orgId",
      "resourceId",
      "resourceType",
    ]),
    callsTable: table("calls", ["id", "orgId", "repId"]),
    ghlUserMappingsTable: table("ghl_user_mappings", [
      "argosUserId",
      "orgId",
    ]),
    invitesTable: table("invites", ["email", "orgId"]),
    organizationsTable: table("organizations", [
      "createdAt",
      "id",
      "logoUrl",
      "name",
      "plan",
      "slug",
      "workspaceTheme",
    ]),
    repManagerAssignmentsTable: table("rep_manager_assignments", [
      "managerId",
      "orgId",
      "repId",
    ]),
    teamMembershipsTable: table("team_memberships", ["orgId", "userId"]),
    teamPermissionGrantsTable: table("team_permission_grants", [
      "grantedBy",
      "orgId",
      "userId",
    ]),
    usersTable: table("users", [
      "displayNameSet",
      "email",
      "firstName",
      "id",
      "lastName",
      "orgId",
      "profileImageUrl",
      "role",
      "updatedAt",
    ]),
  };
});

vi.mock("drizzle-orm", () => ({
  and,
  count,
  eq,
  or,
}));

vi.mock("@argos-v2/db", () => ({
  ...tables,
  getDb: vi.fn(),
}));

type Operation = {
  table: string;
  type: "delete" | "insert" | "select" | "update";
  value?: unknown;
};

function makeTransactionHarness(options: {
  detachedRows?: Array<{ id: string }>;
  memberRows?: Array<{ email: string; id: string; role: string }>;
} = {}) {
  const operations: Operation[] = [];
  const memberRows = options.memberRows ?? [
    {
      email: "rep@argos.ai",
      id: "user-2",
      role: "rep",
    },
  ];
  const detachedRows = options.detachedRows ?? [{ id: "user-2" }];
  const tx = {
    delete: vi.fn((table: { __name: string }) => ({
      where: vi.fn(async () => {
        operations.push({ table: table.__name, type: "delete" });
      }),
    })),
    insert: vi.fn((table: { __name: string }) => ({
      values: vi.fn(async (value: unknown) => {
        operations.push({ table: table.__name, type: "insert", value });
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn((table: { __name: string }) => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            operations.push({ table: table.__name, type: "select" });
            return memberRows;
          }),
        })),
      })),
    })),
    update: vi.fn((table: { __name: string }) => ({
      set: vi.fn((value: unknown) => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => {
            operations.push({ table: table.__name, type: "update", value });
            return detachedRows;
          }),
        })),
      })),
    })),
  };

  return {
    db: {
      transaction: vi.fn(async (callback) => callback(tx)),
    },
    operations,
  };
}

describe("DrizzleUsersRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cleans GHL mappings before detaching the removed member and writing the audit event", async () => {
    const { db, operations } = makeTransactionHarness();
    const { DrizzleUsersRepository } = await import("./repository");
    const repository = new DrizzleUsersRepository(db as never);

    await expect(
      repository.deprovisionOrganizationMember({
        actorId: "user-1",
        orgId: "org-1",
        reason: "Employee left customer account",
        targetUserId: "user-2",
        ticketId: "SUP-123",
      }),
    ).resolves.toBe(true);

    expect(operations.map((operation) => operation.table)).toEqual([
      "users",
      "team_permission_grants",
      "rep_manager_assignments",
      "team_memberships",
      "ghl_user_mappings",
      "invites",
      "users",
      "audit_events",
    ]);
    expect(operations.at(-1)).toMatchObject({
      table: "audit_events",
      type: "insert",
      value: expect.objectContaining({
        actorId: "user-1",
        eventType: "member_removed",
        orgId: "org-1",
        resourceId: "user-2",
        resourceType: "user",
      }),
    });
  });

  it("does not write the audit event when the user detach update does not return a row", async () => {
    const { db, operations } = makeTransactionHarness({ detachedRows: [] });
    const { DrizzleUsersRepository } = await import("./repository");
    const repository = new DrizzleUsersRepository(db as never);

    await expect(
      repository.deprovisionOrganizationMember({
        actorId: "user-1",
        orgId: "org-1",
        reason: "Organization admin removed member",
        targetUserId: "user-2",
        ticketId: null,
      }),
    ).resolves.toBe(false);

    expect(
      operations.some(
        (operation) =>
          operation.table === "audit_events" && operation.type === "insert",
      ),
    ).toBe(false);
  });
});
