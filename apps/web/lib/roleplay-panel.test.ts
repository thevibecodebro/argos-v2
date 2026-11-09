import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RoleplaySession } from "./roleplay/types";
import { RoleplayPanel, isRoleplayVoiceControlDisabled, getRoleplaySessionSelection } from "../components/roleplay-panel";

const roleplayPanelSource = readFileSync(new URL("../components/roleplay-panel.tsx", import.meta.url), "utf8");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("RoleplayPanel", () => {
  it("shows the selected buyer and challenge before starting practice", () => {
    const html = renderToStaticMarkup(createElement(RoleplayPanel, {
      initialPersonas: [{id: "buyer", name: "Dana Mercer", role: "CFO", company: "Apex", industry: "Manufacturing", difficulty: "advanced", objectionType: "ROI & Budget", description: "Numbers-first evaluator.", avatarInitials: "DM", voice: "marin"}],
      initialSessions: [], voiceEnabled: false,
    }));
    expect(html).toContain("Practice with Dana Mercer");
    expect(html).toContain("Challenge");
    expect(html).toContain("ROI &amp; Budget");
    expect(html).toContain("Change buyer");
    expect(html).toMatch(/<details[^>]*>[\s\S]*?<summary/);
  });

  it("keeps an empty buyer list actionable without a disabled conversation", () => {
    const html = renderToStaticMarkup(createElement(RoleplayPanel, {
      initialPersonas: [], initialSessions: [], voiceEnabled: false,
    }));
    expect(html).toContain("Choose a buyer");
    expect(html).toContain("Reload the page to check again.");
    expect(html).toMatch(/data-roleplay-primary-action="start-simulation"[^>]*disabled=""/);
    expect(html).not.toContain("Change buyer (0)");
    expect(html).not.toContain("<details");
    expect(html).not.toContain('data-roleplay-scenario-list="true"');
    expect(html).not.toContain('id="roleplay-response"');
    expect(html).not.toContain('role="log"');
  });

  it("disables same-buyer practice again when the completed buyer is unavailable", () => {
    const html = renderToStaticMarkup(createElement(RoleplayPanel, {
      initialPersonas: [], voiceEnabled: false,
      initialSessions: [{ id: "unavailable-buyer-session", repId: "rep", orgId: "org", persona: "removed-buyer", personaDetails: null, industry: null, difficulty: "intermediate", overallScore: null, origin: "manual", sourceCallId: null, rubricId: null, focusMode: "all", focusCategorySlug: null, scenarioSummary: null, scenarioBrief: null, transcript: [], scorecard: null, status: "complete", voiceStartedAt: null, voiceCompletedAt: null, voiceMinutesSettled: 0, voiceSettledAt: null, createdAt: "2026-11-09T00:00:00Z" }],
    }));
    expect(html).toContain("Completed practice:");
    expect(html).toMatch(/data-roleplay-primary-action="practice-again"[^>]*disabled=""/);
    expect(html).toContain("Choose an available buyer below");
    expect(html).toContain('href="#roleplay-scenario">Choose another buyer</a>');
    expect(html).toContain("A scorecard is not available.");
  });

  it("requires choosing a catalog buyer when the selected session buyer is unavailable", () => {
    const html = renderToStaticMarkup(createElement(RoleplayPanel, {
      initialPersonas: [{ id: "available", name: "Dana", role: "CFO", company: "Apex", industry: "Manufacturing", difficulty: "advanced", objectionType: "ROI", description: "Numbers-first buyer.", avatarInitials: "DM", voice: "marin" }], voiceEnabled: false,
      initialSessions: [{ id: "stale-buyer-session", repId: "rep", orgId: "org", persona: "removed-buyer", personaDetails: null, industry: null, difficulty: "intermediate", overallScore: null, origin: "manual", sourceCallId: null, rubricId: null, focusMode: "all", focusCategorySlug: null, scenarioSummary: null, scenarioBrief: null, transcript: [], scorecard: null, status: "complete", voiceStartedAt: null, voiceCompletedAt: null, voiceMinutesSettled: 0, voiceSettledAt: null, createdAt: "2026-11-09T00:00:00Z" }],
    }));
    expect(html).toContain("Choose an available buyer below to start practice.");
    expect(html).not.toContain("No buyers are available.");
    expect(html).not.toContain("Practice with Dana");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toMatch(/<details[^>]*open=""/);
    expect(html).toMatch(/data-roleplay-primary-action="start-simulation"[^>]*disabled=""/);
    expect(html).toMatch(/data-roleplay-primary-action="practice-again"[^>]*disabled=""/);
    expect(roleplayPanelSource).toContain('if (!personas.some((persona) => persona.id === personaId)) return;');
  });

  it("consumes route requests independently from active-session changes", () => {
    const oldSession = { id: "old-review" } as RoleplaySession;
    const newSession = { id: "new-practice" } as RoleplaySession;
    expect(getRoleplaySessionSelection({ lastConsumedSessionId: "old-review", requestedSessionId: "old-review", activeSessionId: "new-practice", sessions: [oldSession, newSession] })).toEqual({ type: "none" });
    expect(getRoleplaySessionSelection({ lastConsumedSessionId: "new-practice", requestedSessionId: "old-review", activeSessionId: "new-practice", sessions: [oldSession, newSession] })).toEqual({ type: "select", session: oldSession });
    expect(getRoleplaySessionSelection({ lastConsumedSessionId: "old-review", requestedSessionId: "missing", activeSessionId: "new-practice", sessions: [oldSession, newSession] })).toEqual({ type: "load", sessionId: "missing" });
    expect(getRoleplaySessionSelection({ lastConsumedSessionId: undefined, requestedSessionId: "missing", activeSessionId: "old-review", sessions: [oldSession] })).toEqual({ type: "load", sessionId: "missing" });
    expect(getRoleplaySessionSelection({ lastConsumedSessionId: "old-review", requestedSessionId: null, activeSessionId: "new-practice", sessions: [newSession] })).toEqual({ type: "none" });
    expect(getRoleplaySessionSelection({ lastConsumedSessionId: null, requestedSessionId: "old-review", activeSessionId: "new-practice", sessions: [oldSession] })).toEqual({ type: "select", session: oldSession });
    expect(roleplayPanelSource).toContain('router.replace(`/roleplay?sessionId=${encodeURIComponent(payload.id)}`)');
  });

  it("announces roleplay async error and voice statuses", () => {
    expect(roleplayPanelSource).toContain("Roleplay update failed");
    expect(roleplayPanelSource).toContain("Voice practice status");
    expect(roleplayPanelSource).toContain('announce="polite"');
  });

  it("keeps active voice stoppable after a session completes", () => {
    expect(
      isRoleplayVoiceControlDisabled({
        activeSessionStatus: "complete",
        isStartingVoice: false,
        isVoiceActive: false,
      }),
    ).toBe(true);

    expect(
      isRoleplayVoiceControlDisabled({
        activeSessionStatus: "complete",
        isStartingVoice: false,
        isVoiceActive: true,
      }),
    ).toBe(false);

    expect(
      isRoleplayVoiceControlDisabled({
        activeSessionStatus: "complete",
        isStartingVoice: true,
        isVoiceActive: true,
      }),
    ).toBe(false);

    expect(
      isRoleplayVoiceControlDisabled({
        activeSessionStatus: "active",
        isStartingVoice: false,
        isVoiceActive: false,
      }),
    ).toBe(false);
  });

  it("stops active roleplay audio and flushes queued voice transcript turns before scoring", () => {
    const completeSessionStart = roleplayPanelSource.indexOf("async function completeSession()");
    const completeSessionEnd = roleplayPanelSource.indexOf("const selectedPersona", completeSessionStart);
    const completeSessionSource = roleplayPanelSource.slice(completeSessionStart, completeSessionEnd);
    const stopAudioIndex = completeSessionSource.indexOf("stopActiveRoleplayAudio({ announce: false });");
    const flushTranscriptIndex = completeSessionSource.indexOf("await flushPendingVoiceTranscriptPersistence();");
    const completeFetchIndex = completeSessionSource.indexOf("fetch(`/api/roleplay/sessions/${sessionId}/complete`");

    expect(completeSessionStart).toBeGreaterThanOrEqual(0);
    expect(stopAudioIndex).toBeGreaterThanOrEqual(0);
    expect(flushTranscriptIndex).toBeGreaterThanOrEqual(0);
    expect(completeFetchIndex).toBeGreaterThanOrEqual(0);
    expect(stopAudioIndex).toBeLessThan(completeFetchIndex);
    expect(flushTranscriptIndex).toBeLessThan(completeFetchIndex);
    expect(roleplayPanelSource).toContain("activeTranscriptAudioRef");
    expect(roleplayPanelSource).toContain("activeTranscriptAudioRef.current?.pause()");
  });

  it("renders the practice workbench without embedding session history", () => {
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
            voice: "marin",
          },
        ],
        initialSessions: [
          {
            id: "session-1",
            repId: "rep-1",
            orgId: "org-1",
            rubricId: "rubric-1",
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
              voice: "marin",
            },
            industry: "Manufacturing",
            difficulty: "advanced",
            overallScore: 87,
            origin: "manual",
            sourceCallId: null,
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
            voiceStartedAt: null,
            voiceCompletedAt: null,
            voiceMinutesSettled: 0,
            voiceSettledAt: null,
            createdAt: "2026-04-03T00:00:00.000Z",
          },
        ],
        voiceEnabled: true,
      }),
    );

    expect(html).toContain("Session Scorecard");
    expect(html).toContain("Completed practice: ROI &amp; Budget");
    expect(html).not.toContain("Live Simulation:");
    expect(html).toMatch(/data-roleplay-primary-action="practice-again"[^>]*>Practice again/);
    expect(html).not.toMatch(/data-roleplay-primary-action="practice-again"[^>]*disabled=""/);
    expect(html.indexOf('data-roleplay-primary-action="practice-again"')).toBeLessThan(html.indexOf('id="roleplay-practice"'));
    expect(html).toContain('data-roleplay-state="complete"');
    expect(html).toContain('data-roleplay-workspace="simple-practice"');
    expect(html).toContain('data-roleplay-scorecard="visible"');
    expect(html).not.toContain('data-operational-preview-drawer');
    expect(html).toContain('id="roleplay-score"');
    expect(html.indexOf('id="roleplay-score"')).toBeLessThan(html.indexOf('id="roleplay-practice"'));
    expect(html).toContain('data-roleplay-scenario-list="true"');
    expect(html).toContain('id="roleplay-scenario"');
    expect(html).toContain('aria-label="Scenario"');
    expect(html).toContain('data-roleplay-primary-action="start-simulation"');
    expect(html).toContain('data-roleplay-simulation-stage=""');
    expect(html).toContain('aria-labelledby="roleplay-practice-title"');
    expect(html).toContain('aria-label="Category scores"');
    expect(html).toContain("Confidence");
    expect(html).toContain("Stage");
    expect(html).toContain("Improve");
    expect(html).toContain("Frame Control");
    expect(html).not.toContain("Recent History");
    expect(html).toContain('data-roleplay-transcript="simple-log"');
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-label="Roleplay transcript"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain("h-[480px]");
    expect(html).toContain('data-roleplay-mode-control="true"');
    expect(html).not.toContain("Practice mode");
    expect(html).toContain("Start voice");
    expect(html).toMatch(/aria-label="Start voice practice"[^>]*disabled=""/);
    expect(html).not.toContain("Text entry always available");
    expect(html).not.toContain("Generated from call</span><span");
    expect(html).not.toContain('id="roleplay-response"');
    expect(html).not.toContain('aria-label="Send response"');
    expect(html).not.toContain('aria-label="End and score current session"');
    expect(html).not.toContain('aria-labelledby="roleplay-history-title"');
    expect(html).not.toContain('data-roleplay-history-mobile="true"');
    expect(html).not.toContain('data-roleplay-history-table="true"');
    expect(html).not.toContain("Review session");
    expect(html).toContain("Listen");
    expect(html).toContain('data-forge-icon-name="insights"');
    expect(html).not.toContain(">videocam<");
    expect(html).not.toContain(">leaderboard<");
    expect(html).not.toContain(">history<");
  });

  it("renders a clear no-session workspace with next action guidance", () => {
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
            voice: "marin",
          },
        ],
        initialSessions: [],
        voiceEnabled: true,
      }),
    );

    expect(html).toContain('data-roleplay-state="ready"');
    expect(html).toContain('data-roleplay-scenario-picker=""');
    expect(html).toContain('data-roleplay-scenario-list="true"');
    expect(html).toContain('data-roleplay-primary-action="start-simulation"');
    expect(html).toContain('id="roleplay-scenario"');
    expect(html).toContain("Start simulation");
    expect(html).toContain("Practice the conversation. End it when you’re ready for feedback.");
    expect(html).not.toContain('role="log"');
    expect(html).not.toContain('id="roleplay-response"');
    expect(html).not.toContain('data-roleplay-scorecard');
    expect(html).not.toContain("No active simulation");
    expect(html).not.toContain("Practice tip");
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
            voice: "marin",
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
              voice: "marin",
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
            voiceStartedAt: null,
            voiceCompletedAt: null,
            voiceMinutesSettled: 0,
            voiceSettledAt: null,
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
            voiceStartedAt: null,
            voiceCompletedAt: null,
            voiceMinutesSettled: 0,
            voiceSettledAt: null,
            createdAt: "2026-04-04T00:00:00.000Z",
          },
        ],
        initialSessionId: "session-generated",
        voiceEnabled: true,
      }),
    );

    expect(html).toContain("Generated Roleplay: Discovery");
    expect(html).toContain("Generated from call");
    expect(html).toContain("Focus: Discovery");
    expect(html).toContain('data-roleplay-state="active"');
    expect(html).toContain('id="roleplay-response"');
    expect(html).toContain('for="roleplay-response"');
    expect(html).toContain('aria-label="Send response"');
    expect(html).toContain('aria-label="End and score current session"');
    expect(html).toContain('role="log"');
    expect(html).not.toContain("Generated from call</span><span");
    expect(html).toContain("Derived from a real call. Stay concise, skeptical, and push on discovery.");
    expect(html).toContain("An anonymized buyer wants stronger proof and tighter next-step control.");
    expect(html).toContain("Anonymized buyer");
    expect(html).toContain('aria-label="Start voice practice"');
    expect(html).toMatch(/aria-label="Start voice practice"[^>]*disabled=""/);
    expect(html).toContain("Loading live voice access");
    expect(html).not.toContain(">videocam<");
    expect(html).not.toContain(">smart_toy<");
  });
});
