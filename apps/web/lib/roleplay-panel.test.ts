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
            origin: "manual",
            sourceCallId: null,
            rubricId: null,
            focusMode: "all",
            focusCategorySlug: null,
            scenarioSummary: null,
            scenarioBrief: null,
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
    expect(html).toContain("Stage");
    expect(html).toContain("Improve");
    expect(html).toContain("Frame Control");
    expect(html).toContain("Recent History");
    expect(html).toContain("Listen");
  });

  it("opens the requested generated session and renders generated-call context inline", () => {
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
            origin: "manual",
            sourceCallId: null,
            rubricId: null,
            focusMode: "all",
            focusCategorySlug: null,
            scenarioSummary: null,
            scenarioBrief: null,
            transcript: [
              { role: "assistant", content: "Show me the ROI math." },
            ],
            scorecard: null,
            status: "active",
            createdAt: "2026-04-03T00:00:00.000Z",
          },
          {
            id: "session-generated",
            repId: "rep-1",
            orgId: "org-1",
            persona: null,
            personaDetails: null,
            industry: null,
            difficulty: "intermediate",
            overallScore: 74,
            origin: "generated_from_call",
            sourceCallId: "call-22",
            rubricId: "rubric-1",
            focusMode: "category",
            focusCategorySlug: "discovery",
            scenarioSummary:
              "An anonymized buyer wants stronger proof and tighter next-step control.",
            scenarioBrief:
              "Derived from a real call. Stay concise, skeptical, and push on discovery.",
            transcript: [
              {
                role: "assistant",
                content: "Walk me through the problem and why changing it now matters.",
              },
            ],
            scorecard: null,
            status: "active",
            createdAt: "2026-04-04T00:00:00.000Z",
          },
        ],
        initialSessionId: "session-generated",
      }),
    );

    expect(html).toContain("Generated Roleplay: Discovery");
    expect(html).toContain("Generated from call");
    expect(html).toContain("Focus: Discovery");
    expect(html).toContain("Derived from a real call. Stay concise, skeptical, and push on discovery.");
    expect(html).toContain("An anonymized buyer wants stronger proof and tighter next-step control.");
    expect(html).toContain("Anonymized buyer");
  });
});
