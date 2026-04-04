import { describe, expect, it, vi } from "vitest";
import {
  appendRoleplayMessage,
  completeRoleplaySession,
  createRoleplaySession,
  type RoleplayRepository,
} from "./service";

function createRepository(
  overrides: Partial<RoleplayRepository> = {},
): RoleplayRepository {
  return {
    createSession: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findSessionById: vi.fn(),
    findSessionsByRepId: vi.fn(),
    updateSession: vi.fn(),
    ...overrides,
  };
}

describe("createRoleplaySession", () => {
  it("creates an active session with an opening assistant message for the chosen persona", async () => {
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
  });
});

describe("appendRoleplayMessage", () => {
  it("appends the rep message and a generated assistant reply", async () => {
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
  });
});
