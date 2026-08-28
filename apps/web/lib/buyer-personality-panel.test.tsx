import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BuyerPersonalityPanel } from "@/components/buyer-personality-panel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const profile = {
  schemaVersion: 1 as const, confidence: "low" as const, buyerSpeakerLabels: ["Speaker B"], speakerRationale: "Buyer questions", summary: "A direct, proof-focused buyer.",
  communicationStyle: { directness: "high" as const, warmth: "medium" as const, skepticism: "high" as const, patience: "low" as const, detailOrientation: "high" as const, decisionStyle: "analytical" as const, questionStyle: "Specific questions" },
  motivations: ["Reduce manual work"], concerns: ["Implementation risk"], objections: [{ topic: "Timing", expressionStyle: "Direct", evidenceTimestampsSeconds: [42] }], decisionCriteria: ["Clear rollout"], engagementTriggers: [], resistanceTriggers: [], languagePatterns: [],
  roleplayBehavior: { openingPosture: "Busy", conversationalRules: [], escalationRules: [], evidenceNeededToMoveForward: [], realisticResolutionConditions: [] },
};

describe("BuyerPersonalityPanel", () => {
  it("shows concise anonymized buyer behavior", () => {
    const html = renderToStaticMarkup(createElement(BuyerPersonalityPanel, { callId: "call-1", profile, status: "ready", speakerLabels: ["Speaker A", "Speaker B"] }));
    expect(html).toContain("Buyer Personality");
    expect(html).toContain("A direct, proof-focused buyer.");
    expect(html).toContain("Implementation risk");
    expect(html).not.toContain("speakerRationale");
  });

  it("asks for the buyer speaker when confidence needs review", () => {
    const html = renderToStaticMarkup(createElement(BuyerPersonalityPanel, { callId: "call-1", profile, status: "needs_review", speakerLabels: ["Speaker A", "Speaker B"], speakerSamples: { "Speaker B": ["I need implementation proof.", "What happens during rollout?"] } }));
    expect(html).toContain("Needs speaker review");
    expect(html).toContain("Which speaker is the buyer?");
    expect(html).toContain("Confirm buyer speaker");
    expect(html).toContain("I need implementation proof.");
  });
});
