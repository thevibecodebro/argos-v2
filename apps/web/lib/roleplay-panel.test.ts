import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RoleplayPanel } from "../components/roleplay-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("RoleplayPanel", () => {
  it("renders the archived-style scorecard depth and session history", () => {
    const html = renderToStaticMarkup(
      createElement(RoleplayPanel, {
        initialPersonas: [
          {
            id: "skeptical-cfo",
            name: "Dana Mercer",
            role: "CFO",
            company: "Apex Manufacturing",
            industry: "Manufacturing",
            difficulty: "advanced",
            objectionType: "ROI & Budget",
            description: "Numbers-first evaluator.",
            avatarInitials: "DM",
          },
        ],
        initialSessions: [
          {
            id: "session-1",
            repId: "rep-1",
            orgId: "org-1",
            persona: "skeptical-cfo",
            personaDetails: {
              id: "skeptical-cfo",
              name: "Dana Mercer",
              role: "CFO",
              company: "Apex Manufacturing",
              industry: "Manufacturing",
              difficulty: "advanced",
              objectionType: "ROI & Budget",
              description: "Numbers-first evaluator.",
              avatarInitials: "DM",
            },
            industry: "Manufacturing",
            difficulty: "advanced",
            overallScore: 87,
            transcript: [
              { role: "assistant", content: "Show me the ROI math." },
              { role: "user", content: "We cut onboarding time by 32%." },
            ],
            scorecard: {
              summary: "Strong roleplay with clear proof and a concrete close.",
              confidence: "high",
              callStageReached: "commitment",
              categoryScores: {
                frame_control: 84,
                rapport: 72,
                discovery: 79,
                pain_expansion: 76,
                solution: 88,
                objection_handling: 85,
                closing: 91,
              },
              strengths: ["Used quantified business impact."],
              improvements: ["Ask one more discovery question before pitching."],
              recommendedDrills: ["Pain discovery ladder"],
              moments: [
                {
                  category: "solution",
                  severity: "strength",
                  observation: "The rep used quantified proof.",
                  recommendation: "Keep anchoring ROI to current operational pain.",
                },
              ],
            },
            status: "complete",
            createdAt: "2026-04-03T00:00:00.000Z",
          },
        ],
      }),
    );

    expect(html).toContain("Session Scorecard");
    expect(html).toContain("Confidence");
    expect(html).toContain("Call Stage");
    expect(html).toContain("Areas to Improve");
    expect(html).toContain("Frame Control");
    expect(html).toContain("Recent Sessions");
    expect(html).toContain("Voice Mode");
    expect(html).toContain("AI-generated voice");
    expect(html).toContain("Start voice practice");
    expect(html).toContain("Listen");
  });
});
