import { describe, expect, it, vi } from "vitest";

import type { CallDetail } from "@/lib/calls/service";
import type { RubricWithCategories } from "@/lib/rubrics/types";
import { buildGeneratedRoleplayPreview, createGeneratedRoleplaySession } from "./generate-from-call";
import type { RoleplayRepository } from "./service";

function createRepository(overrides: Partial<RoleplayRepository> = {}): RoleplayRepository {
  return {
    createSession: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findSessionById: vi.fn(),
    findSessionsByOrgId: vi.fn(),
    findSessionsByRepId: vi.fn(),
    updateSession: vi.fn(),
    ...overrides,
  };
}

const call = {
  id: "call-22",
  repId: "rep-9",
  status: "complete",
  recordingUrl: null,
  transcriptUrl: null,
  rubric: null,
  categoryScores: [],
  durationSeconds: 1200,
  callTopic: "ACME rollout review",
  overallScore: 61,
  frameControlScore: 52,
  rapportScore: 58,
  discoveryScore: 63,
  painExpansionScore: 57,
  solutionScore: 60,
  objectionScore: 55,
  closingScore: 49,
  confidence: "medium",
  callStageReached: "objection_handling",
  strengths: [],
  improvements: [],
  recommendedDrills: [],
  transcript: [],
  createdAt: "2026-04-20T14:00:00.000Z",
  repFirstName: "Riley",
  repLastName: "Stone",
  moments: [
    {
      id: "moment-1",
      callId: "call-22",
      timestampSeconds: 420,
      category: "closing",
      observation: "The rep never secured a date.",
      recommendation: "Ask for a calendar date before ending.",
      severity: "critical",
      isHighlight: false,
      highlightNote: null,
      createdAt: "2026-04-20T14:00:00.000Z",
    },
  ],
} satisfies CallDetail;

const activeRubric = {
  id: "rubric-active",
  orgId: "org-1",
  version: 5,
  name: "Revenue Rubric",
  description: null,
  status: "active",
  isActive: true,
  isTemplate: false,
  createdBy: null,
  createdAt: "2026-04-20T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
  categoryCount: 2,
  categories: [
    {
      id: "cat-1",
      rubricId: "rubric-active",
      slug: "closing",
      name: "Closing",
      description: "Lock the next step",
      weight: 30,
      sortOrder: 1,
      scoringCriteria: {
        excellent: "Specific ask",
        proficient: "General follow-up",
        developing: "No ask",
        lookFor: [],
      },
      createdAt: "2026-04-20T00:00:00.000Z",
    },
    {
      id: "cat-2",
      rubricId: "rubric-active",
      slug: "discovery",
      name: "Discovery",
      description: "Understand the problem",
      weight: 20,
      sortOrder: 2,
      scoringCriteria: {
        excellent: "Deep",
        proficient: "Adequate",
        developing: "Shallow",
        lookFor: [],
      },
      createdAt: "2026-04-20T00:00:00.000Z",
    },
  ],
} satisfies RubricWithCategories;

describe("buildGeneratedRoleplayPreview", () => {
  it("returns All-first focus options and anonymized scenario copy", () => {
    const preview = buildGeneratedRoleplayPreview({
      call,
      activeRubric,
    });

    expect(preview.defaultFocusSlug).toBe("all");
    expect(preview.focusOptions[0]).toEqual({ slug: "all", label: "All" });
    expect(preview.focusOptions.slice(1)).toEqual([
      { slug: "closing", label: "Closing" },
      { slug: "discovery", label: "Discovery" },
    ]);
    expect(preview.scenarioSummary.toLowerCase()).not.toContain("acme");
    expect(preview.scenarioSummary).toContain("anonymized");
  });
});

describe("createGeneratedRoleplaySession", () => {
  it("pins the active rubric and persists generated-session metadata", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-9",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      createSession: vi.fn().mockResolvedValue({
        id: "session-generated-2",
        repId: "rep-9",
        orgId: "org-1",
        persona: null,
        industry: null,
        difficulty: "intermediate",
        overallScore: null,
        transcript: [{ role: "assistant", content: "Before we wrap, what exactly happens next if I move this forward?" }],
        scorecard: null,
        status: "active",
        rubricId: "rubric-active",
        origin: "generated_from_call",
        sourceCallId: "call-22",
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: "An anonymized buyer wants a firmer close and clearer ownership.",
        scenarioBrief: "Push the rep on commitment and next-step clarity.",
        createdAt: new Date("2026-04-20T16:00:00.000Z"),
      }),
    });

    const result = await createGeneratedRoleplaySession(repository, "auth-user-9", {
      call,
      activeRubric,
      focusCategorySlug: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated roleplay session");
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "generated_from_call",
        sourceCallId: "call-22",
        rubricId: "rubric-active",
        focusMode: "all",
        focusCategorySlug: null,
        persona: null,
        industry: null,
      }),
    );
  });

  it("uses category focus when a focus category is provided", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-9",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      createSession: vi.fn().mockResolvedValue({
        id: "session-generated-3",
        repId: "rep-9",
        orgId: "org-1",
        persona: null,
        industry: null,
        difficulty: "intermediate",
        overallScore: null,
        transcript: [{ role: "assistant", content: "Walk me through the problem and why changing it now matters." }],
        scorecard: null,
        status: "active",
        rubricId: "rubric-active",
        origin: "generated_from_call",
        sourceCallId: "call-22",
        focusMode: "category",
        focusCategorySlug: "discovery",
        scenarioSummary: "An anonymized buyer wants a firmer close and clearer ownership.",
        scenarioBrief: "Push the rep on commitment and next-step clarity.",
        createdAt: new Date("2026-04-20T16:00:00.000Z"),
      }),
    });

    const result = await createGeneratedRoleplaySession(repository, "auth-user-9", {
      call,
      activeRubric,
      focusCategorySlug: "discovery",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected generated roleplay session");
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "generated_from_call",
        sourceCallId: "call-22",
        rubricId: "rubric-active",
        focusMode: "category",
        focusCategorySlug: "discovery",
      }),
    );
  });

  it("returns a 403-style error result when the viewer has no org", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-9",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: null,
      }),
    });

    const result = await createGeneratedRoleplaySession(repository, "auth-user-9", {
      call,
      activeRubric,
      focusCategorySlug: null,
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    });
  });
});
