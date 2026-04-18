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
  it("renders explicit note management controls for highlighted moments", () => {
    const html = renderToStaticMarkup(
      createElement(CallDetailPanel, {
        annotations: [],
        call: baseCall,
        canManage: true,
      }),
    );

    expect(html).toContain("Manager note");
    expect(html).toContain("Set a Strong Frame");
    expect(html).toContain("Transition to Pitch");
    expect(html).toContain("Pitch/Demo");
    expect(html).toContain("Overcome Objections");
    expect(html).toContain("Save note");
    expect(html).toContain("Remove note");
    expect(html).toContain("Remove highlight");
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
