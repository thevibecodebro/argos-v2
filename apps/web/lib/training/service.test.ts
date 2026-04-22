import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccessRepository } from "@/lib/access/create-repository";
import {
  assignTrainingModule,
  createTrainingModule,
  generateTrainingModules,
  generateTrainingModuleDraft,
  getTrainingAiStatus,
  unassignTrainingModule,
  updateTrainingModule,
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
    countModulesByOrgId: vi.fn().mockResolvedValue(1),
    createModule: vi.fn(),
    createModules: vi.fn().mockResolvedValue(undefined),
    findCurrentUserByAuthId: vi.fn(),
    findModuleById: vi.fn(),
    findModulesByOrgId: vi.fn(),
    findProgressByModuleId: vi.fn(),
    findProgressByRepId: vi.fn(),
    findRepIdsByOrgId: vi.fn().mockResolvedValue([]),
    findTeamProgressByOrgId: vi.fn(),
    updateModule: vi.fn(),
    assignModuleToRepIds: vi.fn(),
    removeModuleAssignmentsForRepIds: vi.fn(),
    upsertProgress: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

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

  it("keeps executives read-only on training modules by default", async () => {
    mockAccessRepository({
      actor: { id: "exec-1", orgId: "org-1", role: "executive" },
      memberships: [],
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
          quizData: null,
          orderIndex: 1,
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
        },
      ]),
      findProgressByRepId: vi.fn().mockResolvedValue([]),
    });

    const result = await getTrainingModules(repository, "exec-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected training modules");
    expect(result.data.canManage).toBe(false);
    expect(result.data.modules).toHaveLength(1);
  });
});

describe("getTrainingTeamProgress", () => {
  it("includes dueDate and assignedAt in rep module progress for manager shells", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_training" },
      ],
    });

    const repository = createRepository({
      countModulesByOrgId: vi.fn().mockResolvedValue(1),
      findModulesByOrgId: vi.fn().mockResolvedValue([
        {
          id: "module-1",
          orgId: "org-1",
          title: "Discovery",
          skillCategory: "Discovery",
          videoUrl: null,
          description: "Desc",
          quizData: null,
          orderIndex: 1,
          createdAt: new Date("2026-04-21T00:00:00.000Z"),
        },
      ]),
      findProgressByModuleId: vi.fn().mockResolvedValue([
        {
          id: "progress-1",
          repId: "rep-1",
          moduleId: "module-1",
          status: "assigned",
          score: null,
          attempts: 0,
          completedAt: null,
          assignedBy: "mgr-1",
          assignedAt: new Date("2026-04-21T12:00:00.000Z"),
          dueDate: new Date("2026-04-24T12:00:00.000Z"),
        },
      ]),
      findTeamProgressByOrgId: vi.fn().mockResolvedValue([
        {
          repId: "rep-1",
          firstName: "Riley",
          lastName: "Stone",
          email: "riley@example.com",
          assigned: 1,
          passed: 0,
          completionRate: 0,
        },
      ]),
    });

    const result = await getTrainingTeamProgress(repository, "mgr-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected manager progress payload");
    expect(result.data.progress.repProgress).toEqual([
      {
        repId: "rep-1",
        firstName: "Riley",
        lastName: "Stone",
        moduleProgress: [
          {
            moduleId: "module-1",
            moduleTitle: "Discovery",
            status: "assigned",
            score: null,
            attempts: 0,
            assignedAt: "2026-04-21T12:00:00.000Z",
            dueDate: "2026-04-24T12:00:00.000Z",
          },
        ],
      },
    ]);
  });

  it("provisions starter modules before reading manager progress when the org is empty", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
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
      countModulesByOrgId: vi.fn().mockResolvedValue(0),
      createModules: vi.fn().mockResolvedValue(undefined),
      findModulesByOrgId: vi.fn().mockResolvedValue([
        {
          id: "module-1",
          orgId: "org-1",
          title: "Starter module",
          skillCategory: "Discovery",
          videoUrl: null,
          description: "Desc",
          quizData: null,
          orderIndex: 1,
          createdAt: new Date("2026-04-08T00:00:00.000Z"),
        },
      ]),
      findProgressByModuleId: vi.fn().mockResolvedValue([]),
      findTeamProgressByOrgId: vi.fn().mockResolvedValue([
        {
          repId: "rep-1",
          firstName: "Riley",
          lastName: "Stone",
          email: "riley@example.com",
          assigned: 0,
          passed: 0,
          completionRate: 0,
        },
      ]),
    });

    const result = await getTrainingTeamProgress(repository, "mgr-1");

    expect(result.ok).toBe(true);
    expect(repository.createModules).toHaveBeenCalledOnce();
    expect(repository.findModulesByOrgId).toHaveBeenCalledWith("org-1");
  });

  it("only seeds starter modules once when the manager and team progress views load in parallel", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
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

    let resolveCount!: (value: number) => void;
    const countPending = new Promise<number>((resolve) => {
      resolveCount = resolve;
    });

    const repository = createRepository({
      countModulesByOrgId: vi.fn().mockReturnValue(countPending),
      createModules: vi.fn().mockResolvedValue(undefined),
      findModulesByOrgId: vi.fn().mockResolvedValue([
        {
          id: "module-1",
          orgId: "org-1",
          title: "Starter module",
          skillCategory: "Discovery",
          videoUrl: null,
          description: "Desc",
          quizData: null,
          orderIndex: 1,
          createdAt: new Date("2026-04-08T00:00:00.000Z"),
        },
      ]),
      findProgressByRepId: vi.fn().mockResolvedValue([]),
      findTeamProgressByOrgId: vi.fn().mockResolvedValue([
        {
          repId: "rep-1",
          firstName: "Riley",
          lastName: "Stone",
          email: "riley@example.com",
          assigned: 0,
          passed: 0,
          completionRate: 0,
        },
      ]),
      findProgressByModuleId: vi.fn().mockResolvedValue([]),
    });

    const modulesPromise = getTrainingModules(repository, "mgr-1");
    const progressPromise = getTrainingTeamProgress(repository, "mgr-1");

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(repository.countModulesByOrgId).toHaveBeenCalledTimes(1);
    expect(repository.createModules).not.toHaveBeenCalled();

    resolveCount(0);

    const [modulesResult, progressResult] = await Promise.all([modulesPromise, progressPromise]);

    expect(modulesResult.ok).toBe(true);
    expect(progressResult.ok).toBe(true);
    expect(repository.createModules).toHaveBeenCalledOnce();
  });

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
      findModulesByOrgId: vi.fn().mockResolvedValue([
        {
          id: "module-1",
          orgId: "org-1",
          title: "Discovery That Finds the Real Pain",
          skillCategory: "Discovery",
          videoUrl: null,
          description: "Desc",
          quizData: null,
          orderIndex: 1,
          createdAt: new Date("2026-04-08T00:00:00.000Z"),
        },
      ]),
      findProgressByModuleId: vi.fn().mockResolvedValue([
        {
          id: "progress-1",
          repId: "rep-1",
          moduleId: "module-1",
          status: "passed",
          score: 93,
          attempts: 1,
          completedAt: new Date("2026-04-08T00:00:00.000Z"),
          assignedBy: "mgr-1",
          assignedAt: new Date("2026-04-07T00:00:00.000Z"),
          dueDate: null,
        },
      ]),
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
    expect(result.data.progress).toEqual({
      modules: [{ id: "module-1", title: "Discovery That Finds the Real Pain" }],
      repProgress: [
        {
          repId: "rep-1",
          firstName: "Riley",
          lastName: "Stone",
          moduleProgress: [
            {
              moduleId: "module-1",
              moduleTitle: "Discovery That Finds the Real Pain",
              status: "passed",
              score: 93,
              attempts: 1,
              assignedAt: "2026-04-07T00:00:00.000Z",
              dueDate: null,
            },
          ],
        },
      ],
    });
  });

  it("keeps executive team progress org-wide without requiring team memberships", async () => {
    mockAccessRepository({
      actor: { id: "exec-1", orgId: "org-1", role: "executive" },
      memberships: [],
      grants: [],
    });

    const repository = createRepository({
      findRepIdsByOrgId: vi.fn().mockResolvedValue(["rep-1", "rep-2"]),
      findModulesByOrgId: vi.fn().mockResolvedValue([
        {
          id: "module-1",
          orgId: "org-1",
          title: "Discovery That Finds the Real Pain",
          skillCategory: "Discovery",
          videoUrl: null,
          description: "Desc",
          quizData: null,
          orderIndex: 1,
          createdAt: new Date("2026-04-08T00:00:00.000Z"),
        },
      ]),
      findProgressByModuleId: vi.fn().mockResolvedValue([
        {
          id: "progress-1",
          repId: "rep-2",
          moduleId: "module-1",
          status: "in_progress",
          score: null,
          attempts: 2,
          completedAt: null,
          assignedBy: "mgr-1",
          assignedAt: new Date("2026-04-07T00:00:00.000Z"),
          dueDate: null,
        },
      ]),
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
    expect(result.data.progress.modules).toEqual([
      { id: "module-1", title: "Discovery That Finds the Real Pain" },
    ]);
    expect(result.data.progress.repProgress).toEqual([
      {
        repId: "rep-1",
        firstName: "Riley",
        lastName: "Stone",
        moduleProgress: [],
      },
        {
          repId: "rep-2",
          firstName: "Taylor",
          lastName: "Jones",
          moduleProgress: [
            {
              moduleId: "module-1",
              moduleTitle: "Discovery That Finds the Real Pain",
              status: "in_progress",
              score: null,
              attempts: 2,
              assignedAt: "2026-04-07T00:00:00.000Z",
              dueDate: null,
            },
          ],
        },
      ]);
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

describe("createTrainingModule", () => {
  it("allows a manager with manage_team_training to create a module", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
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
      countModulesByOrgId: vi.fn().mockResolvedValue(0),
      createModule: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "New Module",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Module description",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await createTrainingModule(repository, "mgr-1", {
      title: "New Module",
      description: "Module description",
      skillCategory: "Discovery",
      videoUrl: null,
      quizData: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected module creation");
    expect(repository.createModule).toHaveBeenCalled();
    expect(result.data.module.title).toBe("New Module");
  });

  it("denies a rep from creating a module", async () => {
    mockAccessRepository({
      actor: { id: "rep-1", orgId: "org-1", role: "rep" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    const repository = createRepository();

    const result = await createTrainingModule(repository, "rep-1", {
      title: "New Module",
      description: "Module description",
      skillCategory: "Discovery",
      videoUrl: null,
      quizData: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected create to be denied");
    expect(result.status).toBe(403);
  });
});

describe("updateTrainingModule", () => {
  it("allows a manager with manage_team_training to update a module", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
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
      findModuleById: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Old Title",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Old description",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      updateModule: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Updated Title",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Updated description",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await updateTrainingModule(repository, "mgr-1", "module-1", {
      title: "Updated Title",
      description: "Updated description",
      skillCategory: "Discovery",
      videoUrl: null,
      quizData: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected module update");
    expect(repository.updateModule).toHaveBeenCalled();
    expect(result.data.module.title).toBe("Updated Title");
  });
});

describe("getTrainingAiStatus", () => {
  it("reports AI as unavailable when the API key env is missing", () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const result = getTrainingAiStatus();

    expect(result.available).toBe(false);
  });
});

describe("generateTrainingModules", () => {
  it("rejects oversized generation inputs before calling OpenAI", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateTrainingModules("mgr-1", {
      topic: "A".repeat(121),
      targetRole: "Account Executive",
      moduleCount: 7,
      skillFocus: "B".repeat(121),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected generation validation to fail");
    expect(result.status).toBe(422);
    expect(result.error).toContain("topic, targetRole, and skillFocus");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns generated draft modules when AI is configured", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [{ orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" }],
      grants: [
        {
          orgId: "org-1",
          teamId: "team-a",
          userId: "mgr-1",
          permissionKey: "manage_team_training",
        },
      ],
    });
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  modules: [
                    {
                      title: "Generated Discovery Deep Dive",
                      skillCategory: "Discovery",
                      description: "Teaches reps to uncover operational pain quickly.",
                      quizData: {
                        questions: [
                          {
                            question: "Why ask layered follow-ups?",
                            options: ["To fill time", "To reveal root causes"],
                            correctIndex: 1,
                          },
                        ],
                      },
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateTrainingModules("mgr-1", {
      topic: "Discovery",
      targetRole: "Account Executive",
      moduleCount: 1,
      skillFocus: "Root-cause questioning",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated modules");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("gpt-5-mini");
    expect(result.data.modules).toEqual([
      {
        title: "Generated Discovery Deep Dive",
        skillCategory: "Discovery",
        description: "Teaches reps to uncover operational pain quickly.",
        quizData: {
          questions: [
            {
              question: "Why ask layered follow-ups?",
              options: ["To fill time", "To reveal root causes"],
              correctIndex: 1,
            },
          ],
        },
      },
    ]);
  });
});

describe("generateTrainingModuleDraft", () => {
  it("returns grounded quiz drafts only when module context is attached", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [{ orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" }],
      grants: [
        {
          orgId: "org-1",
          teamId: "team-a",
          userId: "mgr-1",
          permissionKey: "manage_team_training",
        },
      ],
    });
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  draft: {
                    quizData: {
                      questions: [
                        {
                          question: "Why use grounded follow-ups?",
                          options: ["To fill time", "To uncover root causes"],
                          correctIndex: 1,
                        },
                      ],
                    },
                  },
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const repository = createRepository({
      findModuleById: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Discovery That Finds the Real Pain",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Learn how to uncover operational pain.",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-08T00:00:00.000Z"),
      }),
    });

    const result = await generateTrainingModuleDraft(repository, "mgr-1", "module-1", {
      mode: "quiz",
      contextNotes: "Focus on uncovering hidden pain.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated quiz draft");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("gpt-5-mini");
    expect(result.data.mode).toBe("quiz");
    expect(result.data.draft).toEqual({
      quizData: {
        questions: [
          {
            question: "Why use grounded follow-ups?",
            options: ["To fill time", "To uncover root causes"],
            correctIndex: 1,
          },
        ],
      },
    });
  });

  it("requires attached context before generating content drafts", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [{ orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" }],
      grants: [
        {
          orgId: "org-1",
          teamId: "team-a",
          userId: "mgr-1",
          permissionKey: "manage_team_training",
        },
      ],
    });
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const repository = createRepository({
      findModuleById: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Discovery That Finds the Real Pain",
        skillCategory: "Discovery",
        videoUrl: null,
        description: null,
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-08T00:00:00.000Z"),
      }),
    });

    const result = await generateTrainingModuleDraft(repository, "mgr-1", "module-1", {
      mode: "content",
      contextNotes: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected context validation to fail");
    expect(result.status).toBe(422);
    expect(result.error).toBe("Add course context before generating lesson content");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed quiz draft responses from OpenAI", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [{ orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" }],
      grants: [
        {
          orgId: "org-1",
          teamId: "team-a",
          userId: "mgr-1",
          permissionKey: "manage_team_training",
        },
      ],
    });
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    draft: {
                      quizData: {
                        questions: [
                          {
                            question: "Incomplete quiz",
                            options: ["Only one option"],
                            correctIndex: 0,
                          },
                        ],
                      },
                    },
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const repository = createRepository({
      findModuleById: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Discovery That Finds the Real Pain",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Learn how to uncover operational pain.",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-08T00:00:00.000Z"),
      }),
    });

    const result = await generateTrainingModuleDraft(repository, "mgr-1", "module-1", {
      mode: "quiz",
      contextNotes: "Focus on uncovering hidden pain.",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected malformed AI quiz draft to fail");
    expect(result.status).toBe(501);
    expect(result.error).toBe("AI returned malformed quiz draft content");
  });

  it("returns 422 when module draft generation is unavailable", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [{ orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" }],
      grants: [
        {
          orgId: "org-1",
          teamId: "team-a",
          userId: "mgr-1",
          permissionKey: "manage_team_training",
        },
      ],
    });
    vi.stubEnv("OPENAI_API_KEY", "");

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const repository = createRepository({
      findModuleById: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Discovery That Finds the Real Pain",
        skillCategory: "Discovery",
        videoUrl: "https://example.com/training",
        description: "Learn how to uncover operational pain.",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-08T00:00:00.000Z"),
      }),
    });

    const result = await generateTrainingModuleDraft(repository, "mgr-1", "module-1", {
      mode: "content",
      contextNotes: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected unavailable AI validation to fail");
    expect(result.status).toBe(422);
    expect(result.error).toBe("AI curriculum generation is unavailable until OpenAI is configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("assignTrainingModule", () => {
  it("returns rejected reps alongside the assigned reps", async () => {
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
      findRepIdsByOrgId: vi.fn().mockResolvedValue(["rep-1", "rep-2"]),
      findModuleById: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Module",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Description",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      assignModuleToRepIds: vi.fn().mockResolvedValue(undefined),
    });

    const result = await assignTrainingModule(repository, "mgr-1", "module-1", {
      repIds: ["rep-1", "rep-2"],
      dueDate: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected assignment");
    expect(repository.assignModuleToRepIds).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleId: "module-1",
        repIds: ["rep-1"],
      }),
    );
    expect(result.data.assignedRepIds).toEqual(["rep-1"]);
    expect(result.data.rejectedRepIds).toEqual([
      { repId: "rep-2", reason: "out_of_scope" },
    ]);
  });
});

describe("unassignTrainingModule", () => {
  it("blocks unassignment for reps outside the manager's granted teams", async () => {
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
      findModuleById: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Module",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Description",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      findProgressByModuleId: vi.fn().mockResolvedValue([
        {
          id: "progress-1",
          repId: "rep-2",
          moduleId: "module-1",
          status: "assigned",
          score: null,
          attempts: 1,
          completedAt: null,
          assignedBy: "mgr-1",
          assignedAt: new Date("2026-04-03T00:00:00.000Z"),
          dueDate: null,
        },
      ]),
      removeModuleAssignmentsForRepIds: vi.fn(),
    });

    const result = await unassignTrainingModule(repository, "mgr-1", "module-1", "rep-2");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected unassign to be blocked");
    expect(result.status).toBe(403);
    expect(repository.removeModuleAssignmentsForRepIds).not.toHaveBeenCalled();
  });

  it("blocks unassignment after progress has started", async () => {
    mockAccessRepository({
      actor: { id: "mgr-1", orgId: "org-1", role: "manager" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
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
      findModuleById: vi.fn().mockResolvedValue({
        id: "module-1",
        orgId: "org-1",
        title: "Module",
        skillCategory: "Discovery",
        videoUrl: null,
        description: "Description",
        quizData: null,
        orderIndex: 1,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      findProgressByModuleId: vi.fn().mockResolvedValue([
        {
          id: "progress-1",
          repId: "rep-1",
          moduleId: "module-1",
          status: "in_progress",
          score: null,
          attempts: 1,
          completedAt: null,
          assignedBy: "mgr-1",
          assignedAt: new Date("2026-04-03T00:00:00.000Z"),
          dueDate: null,
        },
      ]),
      removeModuleAssignmentsForRepIds: vi.fn(),
    });

    const result = await unassignTrainingModule(repository, "mgr-1", "module-1", "rep-1");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected unassign to be blocked");
    expect(result.status).toBe(409);
    expect(repository.removeModuleAssignmentsForRepIds).not.toHaveBeenCalled();
  });
});
