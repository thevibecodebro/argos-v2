import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAccessRepository } from "@/lib/access/create-repository";
import {
  appendRoleplayMessage,
  closeRoleplaySession,
  completeRoleplaySession,
  createRoleplaySession,
  getRoleplaySession,
  listRoleplaySessions,
  type RoleplayRepository,
} from "./service";

vi.mock("@/lib/access/create-repository", () => ({
  createAccessRepository: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
});

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T00:00:00.000Z"));

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
        status: "active",
        transcript: [
          {
            role: "assistant",
            content: "Thanks for making time. We're watching spend carefully this quarter, so keep it straightforward for me.",
          },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
        startedAt: new Date("2026-04-03T00:00:00.000Z"),
        lastActivityAt: new Date("2026-04-03T00:00:00.000Z"),
        endedAt: null,
        durationSeconds: 0,
      }),
    });

    const result = await createRoleplaySession(repository, "rep-1", "price-sensitive-smb");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected roleplay session");
    expect(result.data.persona).toBe("price-sensitive-smb");
    expect(result.data.personaDetails?.name).toBe("Kevin Torres");
    expect(result.data.transcript[0]).toEqual({
      role: "assistant",
      content: "Thanks for making time. We're watching spend carefully this quarter, so keep it straightforward for me.",
    });
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        startedAt: new Date("2026-04-03T00:00:00.000Z"),
        lastActivityAt: new Date("2026-04-03T00:00:00.000Z"),
        endedAt: null,
        durationSeconds: 0,
      }),
    );
  });
});

describe("appendRoleplayMessage", () => {
  it("blocks cross-org session updates even for admins", async () => {
    mockAccessRepository({
      actor: { id: "admin-1", orgId: "org-1", role: "admin" },
      memberships: [],
      grants: [],
    });

    const repository = createRepository({
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-foreign",
        repId: "rep-foreign",
        orgId: "org-2",
        persona: "skeptical-cfo",
        industry: "Manufacturing",
        difficulty: "advanced",
        overallScore: null,
        status: "active",
        transcript: [{ role: "assistant", content: "Before we go too far, show me the ROI math." }],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await appendRoleplayMessage(repository, "admin-1", "session-foreign", {
      content: "Cross-org attempt",
    });

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: "Roleplay session not found",
    });
    expect(repository.updateSession).not.toHaveBeenCalled();
  });

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

describe("completeRoleplaySession", () => {
  it("marks the session complete and produces a scorecard from the transcript", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T00:05:00.000Z"));

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
        status: "active",
        transcript: [
          { role: "assistant", content: "Timing is tough right now, so tell me why this matters now." },
          { role: "user", content: "Your team is missing next-step discipline and coaching visibility." },
          { role: "assistant", content: "I like the value, but I'd still need a clear next step." },
          { role: "user", content: "Let's put a pilot review on the calendar with your CRO next Tuesday." },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
        startedAt: new Date("2026-04-03T00:00:00.000Z"),
        lastActivityAt: new Date("2026-04-03T00:04:20.000Z"),
        endedAt: null,
        durationSeconds: 260,
      }),
      updateSession: vi.fn().mockImplementation(async (_sessionId, patch) => ({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "stalling-vp",
        industry: "SaaS",
        difficulty: "intermediate",
        overallScore: patch.overallScore ?? null,
        status: patch.status ?? "complete",
        transcript: patch.transcript ?? [],
        scorecard: patch.scorecard ?? null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
        startedAt: new Date("2026-04-03T00:00:00.000Z"),
        lastActivityAt: patch.lastActivityAt ?? new Date("2026-04-03T00:05:00.000Z"),
        endedAt: patch.endedAt ?? new Date("2026-04-03T00:05:00.000Z"),
        durationSeconds: patch.durationSeconds ?? 300,
      })),
    });

    const result = await completeRoleplaySession(repository, "rep-1", "session-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected completed roleplay");
    expect(result.data.status).toBe("complete");
    expect(result.data.overallScore).not.toBeNull();
    expect(result.data.scorecard?.confidence).toBe("high");
    expect(result.data.scorecard?.callStageReached).toBe("commitment");
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
    expect(result.data.durationSeconds).toBe(300);
    expect(result.data.endedAt).toBe("2026-04-03T00:05:00.000Z");
    expect(repository.updateSession).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        status: "complete",
        lastActivityAt: new Date("2026-04-03T00:05:00.000Z"),
        endedAt: new Date("2026-04-03T00:05:00.000Z"),
        durationSeconds: 300,
      }),
    );
  });
});

describe("closeRoleplaySession", () => {
  it("stores a real measured duration for an interrupted session without scoring it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T00:06:00.000Z"));

    mockAccessRepository({
      actor: { id: "rep-1", orgId: "org-1", role: "rep" },
      memberships: [
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ],
      grants: [],
    });

    const repository = createRepository({
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "technical-buyer",
        industry: "AI / Data",
        difficulty: "advanced",
        overallScore: null,
        status: "active",
        transcript: [
          { role: "assistant", content: "I need more technical depth before I can take this seriously." },
          { role: "user", content: "We support API-first rollout with SOC 2 controls." },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
        startedAt: new Date("2026-04-03T00:00:00.000Z"),
        lastActivityAt: new Date("2026-04-03T00:04:30.000Z"),
        endedAt: null,
        durationSeconds: 270,
      }),
      updateSession: vi.fn().mockImplementation(async (_sessionId, patch) => ({
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "technical-buyer",
        industry: "AI / Data",
        difficulty: "advanced",
        overallScore: null,
        status: patch.status ?? "active",
        transcript: [
          { role: "assistant", content: "I need more technical depth before I can take this seriously." },
          { role: "user", content: "We support API-first rollout with SOC 2 controls." },
        ],
        scorecard: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
        startedAt: new Date("2026-04-03T00:00:00.000Z"),
        lastActivityAt: patch.lastActivityAt ?? new Date("2026-04-03T00:06:00.000Z"),
        endedAt: patch.endedAt ?? new Date("2026-04-03T00:06:00.000Z"),
        durationSeconds: patch.durationSeconds ?? 360,
      })),
    });

    const result = await closeRoleplaySession(repository, "rep-1", "session-1");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected closed roleplay session");
    expect(result.data.status).toBe("active");
    expect(result.data.scorecard).toBeNull();
    expect(result.data.durationSeconds).toBe(360);
    expect(result.data.endedAt).toBe("2026-04-03T00:06:00.000Z");
    expect(repository.updateSession).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        lastActivityAt: new Date("2026-04-03T00:06:00.000Z"),
        endedAt: new Date("2026-04-03T00:06:00.000Z"),
        durationSeconds: 360,
      }),
    );
    expect(repository.updateSession).not.toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        status: "complete",
      }),
    );
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
  it("hides cross-org sessions from org admins", async () => {
    mockAccessRepository({
      actor: { id: "admin-1", orgId: "org-1", role: "admin" },
      memberships: [],
      grants: [],
    });

    const repository = createRepository({
      findSessionById: vi.fn().mockResolvedValue({
        id: "session-foreign",
        repId: "rep-foreign",
        orgId: "org-2",
        persona: "skeptical-cfo",
        industry: "Manufacturing",
        difficulty: "advanced",
        overallScore: 88,
        transcript: [{ role: "assistant", content: "Before we go too far, show me the ROI math." }],
        scorecard: null,
        status: "active",
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await getRoleplaySession(repository, "admin-1", "session-foreign");

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: "Roleplay session not found",
    });
  });
});

describe("getRoleplaySession", () => {
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
