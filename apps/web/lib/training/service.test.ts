import { describe, expect, it, vi } from "vitest";
import { createAccessRepository } from "@/lib/access/create-repository";
import {
  getTrainingModules,
  getTrainingTeamProgress,
  submitTrainingProgress,
  type TrainingRepository,
} from "./service";

vi.mock("@/lib/access/create-repository", () => ({
  createAccessRepository: vi.fn(),
}));

function createRepository(
  overrides: Partial<TrainingRepository> = {},
): TrainingRepository {
  return {
    countModulesByOrgId: vi.fn(),
    createModules: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findModulesByOrgId: vi.fn(),
    findProgressByRepId: vi.fn(),
    findRepIdsByOrgId: vi.fn().mockResolvedValue([]),
    findTeamProgressByOrgId: vi.fn(),
    upsertProgress: vi.fn(),
    ...overrides,
  };
}

function mockAccessRepository(input: {
  actor: { id: string; orgId: string; role: "admin" | "executive" | "manager" | "rep" | null };
  memberships: Array<{
    orgId: string;
    teamId: string;
    userId: string;
    membershipType: "rep" | "manager";
  }>;
  grants: Array<{
    orgId: string;
    teamId: string;
    userId: string;
    permissionKey:
      | "view_team_calls"
      | "coach_team_calls"
      | "manage_call_highlights"
      | "view_team_training"
      | "manage_team_training"
      | "manage_team_roster"
      | "view_team_analytics";
  }>;
}) {
  vi.mocked(createAccessRepository).mockReturnValue({
    findActorByAuthUserId: vi.fn().mockResolvedValue(input.actor),
    findMembershipsByOrgId: vi.fn().mockResolvedValue(input.memberships),
    findGrantsByUserId: vi.fn().mockResolvedValue(input.grants),
  } as never);
}

describe("getTrainingModules", () => {
  it("allows a manager with team training grants to view modules and manage their team", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { orgId: "org-1", teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ],
      grants: [
        {
          orgId: "org-1",
          teamId: "team-a",
          userId: "mgr-1",
          permissionKey: "manage_team_training",
        },
      ],
    });

    const repository = createRepository({
      countModulesByOrgId: vi.fn().mockResolvedValue(1),
      findModulesByOrgId: vi.fn().mockResolvedValue([
        {
          id: "module-1",
          orgId: "org-1",
          title: "Module One",
          skillCategory: "Discovery",
          videoUrl: null,
          description: "Module description",
          quizData: null,
          orderIndex: 1,
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
        },
      ]),
      findProgressByRepId: vi.fn().mockResolvedValue([]),
    });

    const result = await getTrainingModules(repository, "mgr-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected training modules");
    expect(result.data.canManage).toBe(true);
    expect(result.data.modules).toHaveLength(1);
    expect(result.data.modules[0].id).toBe("module-1");
  });
});

describe("getTrainingTeamProgress", () => {
  it("returns only team-scoped rep progress for managers", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { orgId: "org-1", teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ],
      grants: [
        {
          orgId: "org-1",
          teamId: "team-a",
          userId: "mgr-1",
          permissionKey: "view_team_training",
        },
      ],
    });

    const repository = createRepository({
      findTeamProgressByOrgId: vi.fn().mockResolvedValue([
        {
          repId: "rep-1",
          firstName: "Riley",
          lastName: "Stone",
          email: "riley@example.com",
          assigned: 3,
          passed: 2,
          completionRate: 67,
        },
        {
          repId: "rep-2",
          firstName: "Taylor",
          lastName: "Jones",
          email: "taylor@example.com",
          assigned: 4,
          passed: 4,
          completionRate: 100,
        },
      ]),
    });

    const result = await getTrainingTeamProgress(repository, "mgr-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected team progress");
    expect(result.data.rows).toEqual([
      {
        repId: "rep-1",
        firstName: "Riley",
        lastName: "Stone",
        email: "riley@example.com",
        assigned: 3,
        passed: 2,
        completionRate: 67,
      },
    ]);
  });

  it("keeps executive team progress org-wide without requiring team memberships", async () => {
    mockAccessRepository({
      actor: { id: "exec-1", orgId: "org-1", role: "executive" },
      memberships: [],
      grants: [],
    });

    const repository = createRepository({
      findRepIdsByOrgId: vi.fn().mockResolvedValue(["rep-1", "rep-2"]),
      findTeamProgressByOrgId: vi.fn().mockResolvedValue([
        {
          repId: "rep-1",
          firstName: "Riley",
          lastName: "Stone",
          email: "riley@example.com",
          assigned: 3,
          passed: 2,
          completionRate: 67,
        },
        {
          repId: "rep-2",
          firstName: "Taylor",
          lastName: "Jones",
          email: "taylor@example.com",
          assigned: 4,
          passed: 4,
          completionRate: 100,
        },
      ]),
    });

    const result = await getTrainingTeamProgress(repository, "exec-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected org-wide team progress");
    expect(result.data.rows).toHaveLength(2);
    expect(result.data.rows.map((row) => row.repId)).toEqual(["rep-1", "rep-2"]);
  });
});

describe("submitTrainingProgress", () => {
  it("allows a rep to submit progress for themselves", async () => {
    mockAccessRepository({
      actor: { id: "rep-1", orgId: "org-1", role: "rep" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    const repository = createRepository({
      countModulesByOrgId: vi.fn().mockResolvedValue(1),
      findModulesByOrgId: vi.fn().mockResolvedValue([
        {
          id: "module-1",
          orgId: "org-1",
          title: "Module One",
          skillCategory: "Discovery",
          videoUrl: null,
          description: "Module description",
          quizData: {
            questions: [
              {
                question: "Q1",
                options: ["A", "B"],
                correctIndex: 0,
              },
            ],
          },
          orderIndex: 1,
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
        },
      ]),
      upsertProgress: vi.fn().mockResolvedValue({
        id: "progress-1",
        repId: "rep-1",
        moduleId: "module-1",
        status: "passed",
        score: 100,
        attempts: 1,
        completedAt: new Date("2026-04-03T00:00:00.000Z"),
        assignedBy: null,
        assignedAt: null,
        dueDate: null,
      }),
    });

    const result = await submitTrainingProgress(repository, "rep-1", "module-1", [0]);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected submitted progress");
    expect(result.data.status).toBe("passed");
    expect(result.data.score).toBe(100);
    expect(result.data.attempts).toBe(1);
  });
});
