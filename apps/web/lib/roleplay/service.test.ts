import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAccessRepository } from "@/lib/access/create-repository";
import {
  appendRoleplayMessage,
  appendRoleplayTranscriptMessage,
  completeRoleplaySession,
  createRoleplaySession,
  getRoleplaySession,
  listRoleplaySessions,
  normalizeRoleplaySessionCreateInput,
  type RoleplayRepository,
} from "./service";

vi.mock("@/lib/access/create-repository", () => ({
  createAccessRepository: vi.fn(),
}));

function createRepository(
  overrides: Partial<RoleplayRepository> = {},
): RoleplayRepository {
  return {
    createSession: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findSessionById: vi.fn(),
    findSessionsByOrgId: vi.fn().mockResolvedValue([]),
    findSessionsByRepId: vi.fn(),
    updateSession: vi.fn(),
    ...overrides,
  };
}

function createRubricsRepositoryStub() {
  const categories = [
    { slug: "discovery", name: "Discovery", description: "", weight: 1, sortOrder: 1, scoringCriteria: { excellent: "", proficient: "", developing: "", lookFor: [] } },
    { slug: "solution", name: "Solution", description: "", weight: 1, sortOrder: 2, scoringCriteria: { excellent: "", proficient: "", developing: "", lookFor: [] } },
    { slug: "closing", name: "Closing", description: "", weight: 1, sortOrder: 3, scoringCriteria: { excellent: "", proficient: "", developing: "", lookFor: [] } },
  ];

  return {
    findActiveRubricByOrgId: vi.fn().mockResolvedValue({
      id: "rubric-1",
      orgId: "org-1",
      name: "Revenue Scorecard",
      description: null,
      sourceType: "manual",
      status: "active",
      version: 2,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      publishedAt: new Date("2026-04-01T00:00:00.000Z"),
      categories,
    }),
    findRubricHistoryByOrgId: vi.fn().mockResolvedValue([
      {
        id: "rubric-1",
        orgId: "org-1",
        name: "Revenue Scorecard",
        description: null,
        sourceType: "manual",
        status: "active",
        version: 2,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        publishedAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    ]),
    findCategoriesByRubricId: vi.fn().mockResolvedValue(categories),
    createDraftRubric: vi.fn(),
    publishDraftRubric: vi.fn(),
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

describe("createRoleplaySession", () => {
  it("creates an active session with an opening assistant message for the chosen persona", async () => {
    mockAccessRepository({
      actor: { id: "rep-1", orgId: "org-1", role: "rep" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      createSession: vi.fn().mockResolvedValue({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "price-sensitive-smb",
        industry: "Professional Services",
        difficulty: "beginner",
        overallScore: null,
        origin: "manual",
        sourceCallId: null,
        rubricId: "rubric-1",
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        status: "active",
        transcript: [
          {
            role: "assistant",
            content: "Thanks for making time. We're watching spend carefully this quarter, so keep it straightforward for me.",
          },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await createRoleplaySession(
      repository,
      "rep-1",
      "price-sensitive-smb",
      createRubricsRepositoryStub() as never,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected roleplay session");
    expect(result.data.persona).toBe("price-sensitive-smb");
    expect(result.data.origin).toBe("manual");
    expect(result.data.focusMode).toBe("all");
    expect(result.data.personaDetails?.name).toBe("Kevin Torres");
    expect(result.data.transcript[0]).toEqual({
      role: "assistant",
      content: "Thanks for making time. We're watching spend carefully this quarter, so keep it straightforward for me.",
    });
  });
});

describe("normalizeRoleplaySessionCreateInput", () => {
  const baseInput = {
    difficulty: "beginner" as const,
    industry: "Professional Services",
    orgId: "org-1",
    persona: "price-sensitive-smb",
    repId: "rep-1",
    scorecard: null,
    status: "active" as const,
    transcript: [],
    rubricId: null,
    scenarioSummary: null,
    scenarioBrief: null,
  };

  it("rejects invalid origin and source call combinations", () => {
    expect(() =>
      normalizeRoleplaySessionCreateInput({
        ...baseInput,
        origin: "manual",
        sourceCallId: "call-1",
        focusMode: "all",
        focusCategorySlug: null,
      } as never),
    ).toThrow("Manual roleplay sessions cannot reference a source call");

    expect(() =>
      normalizeRoleplaySessionCreateInput({
        ...baseInput,
        origin: "generated_from_call",
        sourceCallId: null,
        focusMode: "category",
        focusCategorySlug: "discovery",
      } as never),
    ).toThrow("Generated roleplay sessions require a source call");
  });

  it("rejects invalid focus mode and category combinations", () => {
    expect(() =>
      normalizeRoleplaySessionCreateInput({
        ...baseInput,
        origin: "manual",
        sourceCallId: null,
        focusMode: "category",
        focusCategorySlug: null,
      } as never),
    ).toThrow("Category-focused roleplay sessions require a focus category");

    expect(() =>
      normalizeRoleplaySessionCreateInput({
        ...baseInput,
        origin: "manual",
        sourceCallId: null,
        focusMode: "all",
        focusCategorySlug: "discovery",
      } as never),
    ).toThrow("All-focus roleplay sessions cannot set a focus category");

    expect(
      normalizeRoleplaySessionCreateInput({
        ...baseInput,
        origin: "generated_from_call",
        sourceCallId: "call-1",
        focusMode: "all",
        focusCategorySlug: null,
      } as never),
    ).toMatchObject({
      origin: "generated_from_call",
      sourceCallId: "call-1",
      focusMode: "all",
      focusCategorySlug: null,
    });
  });
});

describe("appendRoleplayMessage", () => {
  it("appends the rep message and a generated assistant reply", async () => {
    mockAccessRepository({
      actor: { id: "rep-1", orgId: "org-1", role: "rep" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "skeptical-cfo",
        industry: "Manufacturing",
        difficulty: "advanced",
        overallScore: null,
        origin: "manual",
        sourceCallId: null,
        rubricId: null,
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        status: "active",
        transcript: [
          { role: "assistant", content: "Before we go too far, show me the ROI math." },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      updateSession: vi.fn().mockImplementation(async (_sessionId, patch) => ({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "skeptical-cfo",
        industry: "Manufacturing",
        difficulty: "advanced",
        overallScore: null,
        origin: "manual",
        sourceCallId: null,
        rubricId: null,
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        status: patch.status ?? "active",
        transcript: patch.transcript ?? [],
        scorecard: patch.scorecard ?? null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      })),
    });

    const result = await appendRoleplayMessage(repository, "rep-1", "session-1", {
      content: "We cut onboarding time by 32% for teams with your call volume.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected updated session");
    expect(result.data.transcript).toHaveLength(3);
    expect(result.data.transcript[1]).toEqual({
      role: "user",
      content: "We cut onboarding time by 32% for teams with your call volume.",
    });
    expect(result.data.transcript[2].role).toBe("assistant");
    expect(result.data.transcript[2].content).toContain("ROI");
  });
});

describe("appendRoleplayTranscriptMessage", () => {
  it("appends a single realtime voice turn without generating another reply", async () => {
    mockAccessRepository({
      actor: { id: "rep-1", orgId: "org-1", role: "rep" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    const updateSession = vi.fn().mockImplementation(async (_sessionId, patch) => ({
      id: "session-1",
      repId: "rep-1",
      orgId: "org-1",
      persona: "stalling-vp",
      industry: "SaaS",
      difficulty: "intermediate",
      overallScore: null,
      origin: "manual",
      sourceCallId: null,
      rubricId: null,
      focusMode: "all",
      focusCategorySlug: null,
      scenarioSummary: null,
      scenarioBrief: null,
      status: patch.status ?? "active",
      transcript: patch.transcript ?? [],
      scorecard: patch.scorecard ?? null,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    }));

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "stalling-vp",
        industry: "SaaS",
        difficulty: "intermediate",
        overallScore: null,
        origin: "manual",
        sourceCallId: null,
        rubricId: null,
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        status: "active",
        transcript: [
          { role: "assistant", content: "Timing is tough right now, so tell me why this matters now." },
          { role: "user", content: "Your team is missing next-step discipline and coaching visibility." },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      updateSession,
    });

    const result = await appendRoleplayTranscriptMessage(repository, "rep-1", "session-1", {
      role: "assistant",
      content: "I still need a clear next step before I commit.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected updated session");
    expect(updateSession).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        status: "active",
        transcript: [
          { role: "assistant", content: "Timing is tough right now, so tell me why this matters now." },
          { role: "user", content: "Your team is missing next-step discipline and coaching visibility." },
          { role: "assistant", content: "I still need a clear next step before I commit." },
        ],
      }),
    );
    expect(result.data.transcript).toHaveLength(3);
    expect(result.data.transcript.at(-1)).toEqual({
      role: "assistant",
      content: "I still need a clear next step before I commit.",
    });
  });

  it("treats an identical consecutive voice turn as a no-op", async () => {
    mockAccessRepository({
      actor: { id: "rep-1", orgId: "org-1", role: "rep" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    const updateSession = vi.fn();

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "stalling-vp",
        industry: "SaaS",
        difficulty: "intermediate",
        overallScore: null,
        origin: "manual",
        sourceCallId: null,
        rubricId: null,
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        status: "active",
        transcript: [
          { role: "assistant", content: "Timing is tough right now, so tell me why this matters now." },
          { role: "assistant", content: "I still need a clear next step before I commit." },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      updateSession,
    });

    const result = await appendRoleplayTranscriptMessage(repository, "rep-1", "session-1", {
      role: "assistant",
      content: "I still need a clear next step before I commit.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected unchanged session");
    expect(updateSession).not.toHaveBeenCalled();
    expect(result.data.transcript).toHaveLength(2);
  });
});

describe("completeRoleplaySession", () => {
  it("marks the session complete and produces a scorecard from the transcript", async () => {
    mockAccessRepository({
      actor: { id: "rep-1", orgId: "org-1", role: "rep" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "stalling-vp",
        industry: "SaaS",
        difficulty: "intermediate",
        overallScore: null,
        origin: "manual",
        sourceCallId: null,
        rubricId: "rubric-1",
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        status: "active",
        transcript: [
          { role: "assistant", content: "Timing is tough right now, so tell me why this matters now." },
          { role: "user", content: "Your team is missing next-step discipline and coaching visibility." },
          { role: "assistant", content: "I like the value, but I'd still need a clear next step." },
          { role: "user", content: "Let's put a pilot review on the calendar with your CRO next Tuesday." },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      updateSession: vi.fn().mockImplementation(async (_sessionId, patch) => ({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "stalling-vp",
        industry: "SaaS",
        difficulty: "intermediate",
        overallScore: patch.overallScore ?? null,
        origin: "manual",
        sourceCallId: null,
        rubricId: "rubric-1",
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        status: patch.status ?? "complete",
        transcript: patch.transcript ?? [],
        scorecard: patch.scorecard ?? null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      })),
    });

    const result = await completeRoleplaySession(
      repository,
      "rep-1",
      "session-1",
      createRubricsRepositoryStub() as never,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected completed roleplay");
    expect(result.data.status).toBe("complete");
    expect(result.data.overallScore).not.toBeNull();
    expect(result.data.scorecard?.confidence).toBe("high");
    expect(result.data.scorecard?.callStageReached).toBe("commitment");
    expect(result.data.scorecard?.rubricId).toBe("rubric-1");
    expect(result.data.scorecard?.categoryScores.solution).toBeGreaterThan(0);
    expect(result.data.scorecard?.categoryScores.closing).toBeGreaterThan(0);
    expect(result.data.scorecard?.improvements.length).toBeGreaterThan(0);
    expect(result.data.scorecard?.recommendedDrills.length).toBeGreaterThan(0);
    expect(result.data.scorecard?.moments.length).toBeGreaterThan(0);
    expect(result.data.scorecard?.moments[0]).toMatchObject({
      category: expect.any(String),
      severity: expect.any(String),
      observation: expect.any(String),
      recommendation: expect.any(String),
    });
  });
});

describe("listRoleplaySessions", () => {
  it("returns only sessions the manager can view through team grants", async () => {
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
          permissionKey: "view_team_calls",
        },
      ],
    });

    const repository = createRepository({
      findSessionsByRepId: vi.fn().mockImplementation(async (repId) => {
        if (repId === "rep-1") {
          return [
            {
              id: "session-1",
              repId: "rep-1",
              orgId: "org-1",
              persona: "skeptical-cfo",
              industry: "Manufacturing",
              difficulty: "advanced",
              overallScore: 88,
              origin: "manual",
              sourceCallId: null,
              rubricId: null,
              focusMode: "all",
              focusCategorySlug: null,
              scenarioSummary: null,
              scenarioBrief: null,
              transcript: [
                { role: "assistant", content: "Before we go too far, show me the ROI math." },
              ],
              scorecard: null,
              status: "active",
              createdAt: new Date("2026-04-03T00:00:00.000Z"),
            },
          ];
        }

        return [
          {
            id: "session-2",
            repId: "rep-2",
            orgId: "org-1",
            persona: "price-sensitive-smb",
            industry: "Professional Services",
            difficulty: "beginner",
            overallScore: 72,
            origin: "manual",
            sourceCallId: null,
            rubricId: null,
            focusMode: "all",
            focusCategorySlug: null,
            scenarioSummary: null,
            scenarioBrief: null,
            transcript: [
              {
                role: "assistant",
                content:
                  "Thanks for making time. We're watching spend carefully this quarter, so keep it straightforward for me.",
              },
            ],
            scorecard: null,
            status: "active",
            createdAt: new Date("2026-04-03T00:00:00.000Z"),
          },
        ];
      }),
    });

    const result = await listRoleplaySessions(repository, "mgr-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected visible roleplay sessions");
    expect(result.data.sessions).toHaveLength(1);
    expect(result.data.sessions[0].repId).toBe("rep-1");
  });

  it("keeps executive roleplay visibility org-wide without team memberships", async () => {
    mockAccessRepository({
      actor: { id: "exec-1", orgId: "org-1", role: "executive" },
      memberships: [],
      grants: [],
    });

    const repository = createRepository({
      findSessionsByOrgId: vi.fn().mockResolvedValue([
        {
          id: "session-2",
          repId: "rep-2",
          orgId: "org-1",
          persona: "price-sensitive-smb",
          industry: "Professional Services",
          difficulty: "beginner",
          overallScore: 72,
          origin: "manual",
          sourceCallId: null,
          rubricId: null,
          focusMode: "all",
          focusCategorySlug: null,
          scenarioSummary: null,
          scenarioBrief: null,
          transcript: [
            {
              role: "assistant",
              content:
                "Thanks for making time. We're watching spend carefully this quarter, so keep it straightforward for me.",
            },
          ],
          scorecard: null,
          status: "active",
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
        },
      ]),
      findSessionsByRepId: vi.fn(),
    });

    const result = await listRoleplaySessions(repository, "exec-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected org-wide roleplay sessions");
    expect(result.data.sessions).toHaveLength(1);
    expect(result.data.sessions[0].repId).toBe("rep-2");
    expect(repository.findSessionsByRepId).not.toHaveBeenCalled();
  });
});

describe("getRoleplaySession", () => {
  it("serializes generated-from-call metadata through getRoleplaySession", async () => {
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
          permissionKey: "view_team_calls",
        },
      ],
    });

    const repository = createRepository({
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-generated-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "technical-buyer",
        industry: "AI / Data",
        difficulty: "advanced",
        overallScore: 91,
        origin: "generated_from_call",
        sourceCallId: "call-123",
        rubricId: "rubric-123",
        focusMode: "category",
        focusCategorySlug: "discovery",
        scenarioSummary: "The buyer needs more technical proof before moving forward.",
        scenarioBrief: "Follow-up roleplay generated from a technical evaluation call.",
        transcript: [
          {
            role: "assistant",
            content:
              "Before I evaluate this seriously, I need to understand how your architecture, security, and integrations hold up.",
          },
          {
            role: "user",
            content: "We use isolated tenants and signed event delivery for every integration.",
          },
        ],
        scorecard: null,
        status: "evaluating",
        createdAt: new Date("2026-04-18T12:00:00.000Z"),
      }),
    });

    const result = await getRoleplaySession(repository, "mgr-1", "session-generated-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated session");
    expect(result.data).toMatchObject({
      id: "session-generated-1",
      origin: "generated_from_call",
      sourceCallId: "call-123",
      rubricId: "rubric-123",
      focusMode: "category",
      focusCategorySlug: "discovery",
      scenarioSummary: "The buyer needs more technical proof before moving forward.",
      scenarioBrief: "Follow-up roleplay generated from a technical evaluation call.",
    });
    expect(result.data.personaDetails?.name).toBe("Alex Chen");
  });

  it("blocks access to sessions outside a manager's team scope", async () => {
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
          permissionKey: "view_team_calls",
        },
      ],
    });

    const repository = createRepository({
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-2",
        repId: "rep-2",
        orgId: "org-1",
        persona: "price-sensitive-smb",
        industry: "Professional Services",
        difficulty: "beginner",
        overallScore: 72,
        origin: "manual",
        sourceCallId: null,
        rubricId: null,
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        transcript: [
          {
            role: "assistant",
            content:
              "Thanks for making time. We're watching spend carefully this quarter, so keep it straightforward for me.",
          },
        ],
        scorecard: null,
        status: "active",
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await getRoleplaySession(repository, "mgr-1", "session-2");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected roleplay access to be denied");
    expect(result.status).toBe(403);
  });
});
