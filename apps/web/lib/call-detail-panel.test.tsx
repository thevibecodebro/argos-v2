import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CallDetailPanel } from "../components/call-detail-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const baseCall = {
  id: "call-1",
  status: "complete",
  overallScore: 88,
  durationSeconds: 942,
  callTopic: "ACME discovery",
  repId: "rep-1",
  createdAt: "2026-04-03T00:00:00.000Z",
  repFirstName: "Riley",
  repLastName: "Stone",
  recordingUrl: null,
  transcriptUrl: null,
  rubric: {
    id: "rubric-1",
    name: "ACME Enterprise Scorecard",
    version: 3,
    status: "active",
  },
  categoryScores: [
    {
      categoryId: "cat-1",
      slug: "frame_control",
      name: "Set a Strong Frame",
      description: "Set expectations and keep control of the meeting.",
      weight: 15,
      sortOrder: 1,
      score: 86,
    },
    {
      categoryId: "cat-2",
      slug: "pain_expansion",
      name: "Transition to Pitch",
      description: "Bridge discovery into a focused pitch.",
      weight: 5,
      sortOrder: 2,
      score: 79,
    },
    {
      categoryId: "cat-3",
      slug: "solution",
      name: "Pitch/Demo",
      description: "Map the product to confirmed pain.",
      weight: 15,
      sortOrder: 3,
      score: 88,
    },
    {
      categoryId: "cat-4",
      slug: "objection_handling",
      name: "Overcome Objections",
      description: "Clarify and resolve objections.",
      weight: 15,
      sortOrder: 4,
      score: 81,
    },
  ],
  frameControlScore: 86,
  rapportScore: 83,
  discoveryScore: 90,
  painExpansionScore: 79,
  solutionScore: 88,
  objectionScore: 81,
  closingScore: 84,
  confidence: "high",
  callStageReached: "discovery",
  strengths: [],
  improvements: [],
  recommendedDrills: [],
  transcript: [],
  moments: [
    {
      id: "moment-1",
      callId: "call-1",
      timestampSeconds: 132,
      category: "Discovery",
      observation: "The rep uncovered a deeper workflow bottleneck.",
      recommendation: "Anchor the next question to the reporting delay.",
      severity: "strength" as const,
      isHighlight: true,
      highlightNote: "Use this in the next team coaching review.",
      createdAt: "2026-04-03T00:02:12.000Z",
    },
  ],
};

describe("CallDetailPanel", () => {
  it("renders Generate Roleplay for completed calls", () => {
    const html = renderToStaticMarkup(
      createElement(CallDetailPanel, {
        annotations: [],
        call: baseCall,
        canManage: true,
      }),
    );

    expect(html).toContain("Generate Roleplay");
  });

  it("does not render Generate Roleplay for incomplete calls", () => {
    const html = renderToStaticMarkup(
      createElement(CallDetailPanel, {
        annotations: [],
        call: {
          ...baseCall,
          status: "processing",
        },
        canManage: true,
      }),
    );

    expect(html).not.toContain("Generate Roleplay");
  });

  it("renders explicit note management controls for highlighted moments", () => {
    const html = renderToStaticMarkup(
      createElement(CallDetailPanel, {
        annotations: [],
        call: baseCall,
        canManage: true,
      }),
    );

    expect(html).toContain("Manager note");
    expect(html).toContain("ACME Enterprise Scorecard");
    expect(html).toContain("Set a Strong Frame");
    expect(html).toContain("Transition to Pitch");
    expect(html).toContain("Pitch/Demo");
    expect(html).toContain("Overcome Objections");
    expect(html).toContain("Save note");
    expect(html).toContain("Remove note");
    expect(html).toContain("Remove highlight");
  });

  it("uses the forge review bench treatment instead of the old blue glass style", () => {
    const html = renderToStaticMarkup(
      createElement(CallDetailPanel, {
        annotations: [],
        call: baseCall,
        canManage: true,
      }),
    );

    expect(html).toContain('data-call-detail-panel="forge-review-bench"');
    expect(html).toContain('data-forge-surface="panel"');
    expect(html).toContain('data-forge-chip="cyan"');
    expect(html).toContain("Revenue Scorecard");
    expect(html).toContain("Workbench");
    expect(html).toContain('data-forge-segmented-tabs="true"');
    expect(html).toContain("Transcript");
    expect(html).toContain("Key Moments");
    expect(html).toContain("Call Summary");
    expect(html).toContain("Coaching Notes");
    expect(html).toContain("ACME Enterprise Scorecard");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
    expect(html).not.toContain("backdrop-blur-md");
    expect(html).not.toContain("border-l-2");
    expect(html).not.toContain(">search</span>");
    expect(html).not.toContain(">insights</span>");
    expect(html).not.toContain(">edit_note</span>");
    expect(html).not.toContain(">play_arrow</span>");
  });

  it("renders highlight notes for read-only viewers without management controls", () => {
    const html = renderToStaticMarkup(
      createElement(CallDetailPanel, {
        annotations: [],
        call: baseCall,
        canManage: false,
      }),
    );

    expect(html).toContain("Manager note");
    expect(html).toContain("Use this in the next team coaching review.");
    expect(html).not.toContain("Save note");
    expect(html).not.toContain("Remove note");
    expect(html).not.toContain("Remove highlight");
  });
});
