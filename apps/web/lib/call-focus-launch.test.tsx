// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CallDetailPanel } from "@/components/call-detail-panel";
import type { CallDetail } from "@/lib/calls/service";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const call = {
  id: "call-1", status: "complete", overallScore: 63, durationSeconds: 1200,
  callTopic: "Discovery call", repId: "rep-1", createdAt: "2026-09-25T12:00:00.000Z",
  repFirstName: "Riley", repLastName: "Stone", recordingUrl: null, transcriptUrl: null,
  rubric: null, categoryScores: [], frameControlScore: null, rapportScore: null,
  discoveryScore: 52, painExpansionScore: null, solutionScore: null,
  objectionScore: null, closingScore: null, confidence: "high", callStageReached: "discovery",
  strengths: [], improvements: [], recommendedDrills: [], transcript: [], moments: [],
  processingJob: null, buyerProfileStatus: "ready", buyerPersonalityProfile: null,
} satisfies CallDetail;

describe("call focus launch", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    vi.unstubAllGlobals();
  });

  it("opens the existing roleplay dialog with the linked skill selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        defaultFocusSlug: "all",
        focusOptions: [{ slug: "all", label: "All" }, { slug: "discovery", label: "Discovery" }],
        scenarioSummary: "Practice discovery from this call.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<CallDetailPanel annotations={[]} call={call} canManage={false}
        canGenerateRoleplay canRetryProcessing={false} initialFocusCategorySlug="discovery" />);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/calls/call-1/generate-roleplay", { cache: "no-store" });
    expect(document.querySelector("[role=dialog] select")?.getAttribute("value") ??
      (document.querySelector("[role=dialog] select") as HTMLSelectElement | null)?.value).toBe("discovery");
  });
});
