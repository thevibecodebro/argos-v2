import { beforeEach, describe, expect, it, vi } from "vitest";
import { platformAuditEventsTable } from "@argos-v2/db";
import { DrizzlePlatformRepository } from "./platform/repository";

const getAuthenticatedSupabaseUser = vi.fn();
const createInvitesRepository = vi.fn();
const createUsersRepository = vi.fn();
const createPlatformRepository = vi.fn();
const sendInvite = vi.fn();
const checkRateLimitForPolicy = vi.fn();
const cookies = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/invites/create-repository", () => ({
  createInvitesRepository,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/invites/service", () => ({
  sendInvite,
  listPendingInvites: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy,
  rateLimitExceededResponse: (result: { retryAfterSeconds: number }) =>
    Response.json(
      {
        code: "rate_limit_exceeded",
        error: "Too many requests. Try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    ),
}));

type PlatformOperation =
  | {
      kind: "insert";
      table: unknown;
      values?: unknown;
    }
  | {
      kind: "select";
      from?: unknown;
      joins: unknown[];
      limitValue?: number;
      whereCount: number;
    };

function createPlatformRepositoryHarness(results: unknown[][] = []) {
  const operations: PlatformOperation[] = [];
  const queuedResults = [...results];

  function nextResult() {
    return queuedResults.shift() ?? [];
  }

  function createSelectBuilder() {
    const operation: PlatformOperation = {
      kind: "select",
      joins: [],
      whereCount: 0,
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
      where() {
        operation.whereCount += 1;
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
    const operation: PlatformOperation = { kind: "insert", table };
    operations.push(operation);

    const builder = {
      values(values: unknown) {
        operation.values = values;
        return builder;
      },
      returning() {
        return Promise.resolve(nextResult());
      },
    };

    return builder;
  }

  const db = {
    insert: vi.fn(createInsertBuilder),
    select: vi.fn(createSelectBuilder),
  };

  return {
    operations,
    repository: new DrizzlePlatformRepository(db as never),
  };
}

describe("invites route", () => {
  const usersRepository = {
    findCurrentUserByAuthId: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createInvitesRepository.mockReset();
    createUsersRepository.mockReset();
    createPlatformRepository.mockReset();
    usersRepository.findCurrentUserByAuthId.mockReset();
    sendInvite.mockReset();
    checkRateLimitForPolicy.mockReset();
    cookies.mockReset();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createInvitesRepository.mockReturnValue({});
    createUsersRepository.mockReturnValue(usersRepository);
    createPlatformRepository.mockReturnValue({ platform: true });
    cookies.mockResolvedValue(new Map());
    usersRepository.findCurrentUserByAuthId.mockResolvedValue({
      id: "auth-user-1",
      email: "admin@acme.com",
      orgId: "org-1",
      role: "admin",
      org: { id: "org-1", name: "Acme", slug: "acme", plan: "trial", createdAt: "2026-04-28T00:00:00.000Z" },
      displayNameSet: true,
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
    });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      requestCount: 1,
      retryAfterSeconds: 3600,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "invites:org:hash",
    });
  });

  it("returns 429 when the org invite limit is exceeded", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      limit: 10,
      remaining: 0,
      requestCount: 11,
      retryAfterSeconds: 321,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "invites:org:hash",
    });

    const route = await import("../app/api/invites/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "rep@acme.com",
          role: "rep",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("321");
    await expect(response.json()).resolves.toMatchObject({
      code: "rate_limit_exceeded",
      retryAfterSeconds: 321,
    });
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("invites", {
      type: "org",
      id: "org-1",
    });
    expect(sendInvite).not.toHaveBeenCalled();
  });

  it("sends an invite as platform-switched org admin and writes platform audit", async () => {
    const createdAt = new Date("2026-06-11T12:00:00.000Z");
    const { operations, repository } = createPlatformRepositoryHarness([
      [
        {
          createdAt,
          createdBy: null,
          revokedAt: null,
          revokedBy: null,
          role: "operator",
          status: "active",
          updatedAt: createdAt,
          userId: "staff-1",
        },
      ],
      [
        {
          endedAt: null,
          expiresAt: new Date("2026-06-11T13:00:00.000Z"),
          id: "session-1",
          reason: "Support escalation",
          staffEmailSnapshot: "operator@argos.test",
          staffRoleSnapshot: "operator",
          staffUserId: "staff-1",
          startedAt: createdAt,
          status: "active",
          targetOrgId: "org-1",
          targetOrgName: "Acme",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlug: "acme",
          targetOrgSlugSnapshot: "acme",
        },
      ],
      [
        {
          action: "platform.workspace.invite.create",
          createdAt,
          id: "audit-1",
          metadata: {
            email: "new-admin@acme.com",
            role: "admin",
            route: "/api/invites",
          },
          reason: "Support escalation",
          resourceId: "invite-1",
          resourceType: "invite",
          sessionId: "session-1",
          staffEmailSnapshot: "operator@argos.test",
          staffRoleSnapshot: "operator",
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          targetOrgNameSnapshot: "Acme",
          targetOrgSlugSnapshot: "acme",
        },
      ],
    ]);
    getAuthenticatedSupabaseUser.mockResolvedValueOnce({ id: "staff-1" });
    createPlatformRepository.mockReturnValueOnce(repository);
    cookies.mockResolvedValueOnce(new Map([["argos_platform_session", "session-1"]]));
    sendInvite.mockResolvedValueOnce({
      ok: true,
      data: {
        acceptedAt: null,
        createdAt: new Date("2026-06-11T12:00:00.000Z"),
        email: "new-admin@acme.com",
        expiresAt: new Date("2026-06-18T12:00:00.000Z"),
        id: "invite-1",
        orgId: "org-1",
        role: "admin",
        teamIds: null,
        token: "invite-token",
      },
    });

    const route = await import("../app/api/invites/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/invites", {
        body: JSON.stringify({
          email: "new-admin@acme.com",
          role: "admin",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(usersRepository.findCurrentUserByAuthId).not.toHaveBeenCalled();
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("invites", {
      type: "org",
      id: "org-1",
    });
    expect(sendInvite).toHaveBeenCalledWith(
      {},
      usersRepository,
      "staff-1",
      {
        email: "new-admin@acme.com",
        role: "admin",
      },
      {
        caller: expect.objectContaining({
          email: "operator@argos.test",
          id: "staff-1",
          orgId: "org-1",
          role: "admin",
          org: expect.objectContaining({
            id: "org-1",
            name: "Acme",
            slug: "acme",
          }),
        }),
      },
    );
    expect(operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "select", limitValue: 1, whereCount: 1 }),
        expect.objectContaining({ kind: "select", limitValue: 1, whereCount: 1 }),
        expect.objectContaining({
          kind: "insert",
          table: platformAuditEventsTable,
          values: {
            action: "platform.workspace.invite.create",
            metadata: {
              email: "new-admin@acme.com",
              role: "admin",
              route: "/api/invites",
            },
            reason: "Support escalation",
            resourceId: "invite-1",
            resourceType: "invite",
            sessionId: "session-1",
            staffEmailSnapshot: "operator@argos.test",
            staffRoleSnapshot: "operator",
            staffUserId: "staff-1",
            targetOrgId: "org-1",
            targetOrgNameSnapshot: "Acme",
            targetOrgSlugSnapshot: "acme",
          },
        }),
      ]),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      id: "invite-1",
      email: "new-admin@acme.com",
      role: "admin",
    });
  });
});
