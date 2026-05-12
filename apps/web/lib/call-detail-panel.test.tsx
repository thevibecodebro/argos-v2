import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CallDetail } from "./calls/service";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const callDetailPanelSource = readFileSync(new URL("../components/call-detail-panel.tsx", import.meta.url), "utf8");

afterEach(() => {
  vi.doUnmock("react");
  vi.doUnmock("@/components/forge-dialog");
  vi.resetModules();
});

async function renderCallDetailPanel({
  call = baseCall,
  canManage = true,
  canRetryProcessing = true,
}: {
  call?: typeof baseCall;
  canManage?: boolean;
  canRetryProcessing?: boolean;
} = {}) {
  const { CallDetailPanel } = await import("../components/call-detail-panel");

  return renderToStaticMarkup(
    createElement(CallDetailPanel, {
      annotations: [],
      call,
      canManage,
      canRetryProcessing,
    }),
  );
}

const baseCall: CallDetail = {
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
  processingJob: null,
};

describe("CallDetailPanel", () => {
  it("classifies explicit media and analysis states", async () => {
    const { getCallMediaState } = await import("../components/call-detail-panel");

    expect(getCallMediaState({ hasRecording: false, hasTranscript: false, status: "complete" })).toMatchObject({
      title: "Recording unavailable",
      tone: "muted",
    });
    expect(getCallMediaState({ hasRecording: true, hasTranscript: false, status: "complete" })).toMatchObject({
      title: "Transcript unavailable",
      tone: "ember",
    });
    expect(getCallMediaState({ hasRecording: true, hasTranscript: true, status: "complete" })).toMatchObject({
      title: "Review data ready",
      tone: "success",
    });
    expect(getCallMediaState({ hasRecording: true, hasTranscript: true, status: "processing" })).toMatchObject({
      title: "Processing call",
      tone: "gold",
    });
    expect(getCallMediaState({ hasRecording: true, hasTranscript: false, status: "failed" })).toMatchObject({
      title: "Processing failed",
      tone: "danger",
    });
  });

  it("renders Generate Roleplay for completed calls", async () => {
    const html = await renderCallDetailPanel();

    expect(html).toContain("Generate Roleplay");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("announces call detail busy states through a shared live region", () => {
    expect(callDetailPanelSource).toContain("Saving coaching note.");
    expect(callDetailPanelSource).toContain("Preparing roleplay scenario.");
    expect(callDetailPanelSource).toContain("Generating roleplay session.");
    expect(callDetailPanelSource).toContain("Updating highlight note.");
    expect(callDetailPanelSource).toContain("Updating highlighted moment.");
  });

  it("lets reps choose the generated roleplay buyer voice before starting", () => {
    expect(callDetailPanelSource).toContain("buyerVoice");
    expect(callDetailPanelSource).toContain("setBuyerVoice");
    expect(callDetailPanelSource).toContain("Buyer voice");
    expect(callDetailPanelSource).toContain("GENERATED_ROLEPLAY_BUYER_PERSONAS[voice].label");
    expect(callDetailPanelSource).toContain('data-generated-roleplay-buyer-voice="true"');
  });

  it("does not render Generate Roleplay for incomplete calls", async () => {
    const html = await renderCallDetailPanel({
      call: {
        ...baseCall,
        status: "processing",
      },
    });

    expect(html).not.toContain("Generate Roleplay");
  });

  it("renders explicit note management controls for highlighted moments", async () => {
    const html = await renderCallDetailPanel();

    expect(html).toContain("Manager note");
    expect(html).toContain("Workbench");
    expect(html).toContain("Key Moments");
    expect(html).toContain("Save note");
    expect(html).toContain("Remove note");
    expect(html).toContain("Remove highlight");
    expect(html).toContain("Coaching note");
    expect(html).toContain('id="call-coaching-note"');
    expect(html).toContain('aria-describedby="call-coaching-note-help"');
    expect(html).toContain("Add a plain-text coaching note for this call.");
    expect(html).not.toContain('aria-label="Attach file"');
    expect(html).not.toContain('aria-label="Mention teammate"');
  });

  it("renders operator processing job detail and retry action for failed jobs", async () => {
    const html = await renderCallDetailPanel({
      call: {
        ...baseCall,
        status: "failed",
        processingJob: {
          id: "job-1",
          status: "failed",
          attemptCount: 3,
          maxAttempts: 3,
          nextRunAt: "2026-04-03T00:15:00.000Z",
          lastStage: "transcribe",
          lastError: "OpenAI transcription request failed: 429",
          updatedAt: "2026-04-03T00:10:00.000Z",
        },
      },
      canRetryProcessing: true,
    });

    expect(html).toContain('data-processing-job-panel="true"');
    expect(html).toContain("Processing job");
    expect(html).toContain("failed");
    expect(html).toContain("transcribe");
    expect(html).toContain("OpenAI transcription request failed: 429");
    expect(html).toContain("Retry processing");
  });

  it("hides the processing retry action from non-operators", async () => {
    const html = await renderCallDetailPanel({
      call: {
        ...baseCall,
        status: "failed",
        processingJob: {
          id: "job-1",
          status: "failed",
          attemptCount: 3,
          maxAttempts: 3,
          nextRunAt: "2026-04-03T00:15:00.000Z",
          lastStage: "score",
          lastError: "Scoring failed",
          updatedAt: "2026-04-03T00:10:00.000Z",
        },
      },
      canRetryProcessing: false,
    });

    expect(html).toContain('data-processing-job-panel="true"');
    expect(html).not.toContain("Retry processing");
  });

  it("uses the forge review bench treatment instead of the old blue glass style", async () => {
    const html = await renderCallDetailPanel();

    expect(html).toContain('data-call-detail-panel="forge-review-bench"');
    expect(html).toContain('data-forge-surface="panel"');
    expect(html).toContain('data-forge-chip="cyan"');
    expect(html).toContain("Workbench");
    expect(html).toContain('data-forge-segmented-tabs="true"');
    expect(html).toContain("Transcript");
    expect(html).toContain("Key Moments");
    expect(html).toContain("Call Summary");
    expect(html).toContain("Coaching Notes");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
    expect(html).not.toContain("backdrop-blur-md");
    expect(html).not.toContain("border-l-2");
    expect(html).not.toContain(">search</span>");
    expect(html).not.toContain(">insights</span>");
    expect(html).not.toContain(">edit_note</span>");
    expect(html).not.toContain(">play_arrow</span>");
  });

  it("renders honest media status when no recording is linked", async () => {
    const html = await renderCallDetailPanel();

    expect(html).toContain("Transcript pending");
    expect(html).toContain("No transcript lines are available yet.");
    expect(html).not.toContain(">play_arrow</span>");
    expect(html).not.toContain(">Preview</span>");
  });

  it("does not show fake playback controls when a recording is linked but no player is wired", async () => {
    const html = await renderCallDetailPanel({
      call: {
        ...baseCall,
        recordingUrl: "https://cdn.example.com/calls/call-1.mp3",
        transcriptUrl: "https://cdn.example.com/calls/call-1.txt",
      },
    });

    expect(html).toContain('data-call-detail-panel="forge-review-bench"');
    expect(html).toContain("Transcript pending");
    expect(html).not.toContain(">play_arrow</span>");
  });

  it("renders highlight notes for read-only viewers without management controls", async () => {
    const html = await renderCallDetailPanel({ canManage: false });

    expect(html).toContain("Manager note");
    expect(html).toContain("Use this in the next team coaching review.");
    expect(html).not.toContain("Save note");
    expect(html).not.toContain("Remove note");
    expect(html).not.toContain("Remove highlight");
  });

  it("passes labelled content and actions to the Generate Roleplay ForgeDialog boundary", async () => {
    vi.resetModules();
    vi.doMock("@/components/forge-dialog", () => ({
      ForgeDialog: ({
        children,
        description,
        footer,
        open,
        title,
      }: {
        children?: ReactNode;
        description?: string;
        footer?: ReactNode;
        onOpenChange: (open: boolean) => void;
        open: boolean;
        title: string;
      }) =>
        createElement(
          "section",
          { "data-mocked-forge-dialog": "true", "data-open": String(open) },
          createElement("h2", null, title),
          description ? createElement("p", null, description) : null,
          createElement("div", { "data-mocked-forge-dialog-body": "true" }, children),
          createElement("div", { "data-mocked-forge-dialog-footer": "true" }, footer),
        ),
    }));

    const { CallDetailPanel } = await import("../components/call-detail-panel");
    const html = renderToStaticMarkup(
      createElement(CallDetailPanel, {
        annotations: [],
        call: baseCall,
        canManage: true,
        canRetryProcessing: true,
      }),
    );

    expect(html).toContain('data-mocked-forge-dialog="true"');
    expect(html).toContain('data-open="false"');
    expect(html).toContain('data-mocked-forge-dialog-body="true"');
    expect(html).toContain('data-mocked-forge-dialog-footer="true"');
    expect(html).toContain('class="space-y-4"');
    expect(html).toContain("Generate Roleplay");
    expect(html).toContain("Launch a saved roleplay from this completed call.");
    expect(html).toContain("Cancel");
    expect(html).toContain("Generate &amp; Start");
    expect(html).not.toContain('class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,4,3,0.72)] px-4 py-8"');
  });
});
