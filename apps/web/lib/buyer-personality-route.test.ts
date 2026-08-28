import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAnyAuthenticatedManagedCapability = vi.fn();
const requireAuthenticatedManagedCapability = vi.fn();
const createCallsRepository = vi.fn();
const createEffectiveTenantRepository = vi.fn();
const getCallDetail = vi.fn();
const checkRateLimitForPolicy = vi.fn();
const extractBuyerPersonalityFromTranscript = vi.fn();

vi.mock("@/lib/access/managed-capabilities-server", () => ({ requireAnyAuthenticatedManagedCapability, requireAuthenticatedManagedCapability }));
vi.mock("@/lib/calls/create-repository", () => ({ createCallsRepository }));
vi.mock("@/lib/platform/effective-request", () => ({ createEffectiveTenantRepository }));
vi.mock("@/lib/calls/service", () => ({ getCallDetail }));
vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy,
  rateLimitExceededResponse: () => Response.json({ error: "Too many requests" }, { status: 429 }),
}));
vi.mock("@argos-v2/call-processing", () => ({ extractBuyerPersonalityFromTranscript }));

describe("buyer personality route", () => {
  const repository = { updateBuyerPersonalityProfile: vi.fn() };
  const profile = {
    schemaVersion: 1, confidence: "high", buyerSpeakerLabels: ["Speaker B"], speakerRationale: "Buyer questions", summary: "Direct buyer",
    communicationStyle: { directness: "high", warmth: "medium", skepticism: "high", patience: "low", detailOrientation: "high", decisionStyle: "analytical", questionStyle: "Specific" },
    motivations: [], concerns: [], objections: [], decisionCriteria: [], engagementTriggers: [], resistanceTriggers: [], languagePatterns: [],
    roleplayBehavior: { openingPosture: "Skeptical", conversationalRules: [], escalationRules: [], evidenceNeededToMoveForward: [], realisticResolutionConditions: [] },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAnyAuthenticatedManagedCapability.mockResolvedValue({ ok: true, user: { id: "auth-1" }, orgId: "org-1", access: {} });
    requireAuthenticatedManagedCapability.mockResolvedValue({ ok: true, user: { id: "auth-1" }, orgId: "org-1", access: {} });
    createCallsRepository.mockReturnValue(repository);
    createEffectiveTenantRepository.mockResolvedValue(repository);
    checkRateLimitForPolicy.mockResolvedValue({ allowed: true });
    getCallDetail.mockResolvedValue({ ok: true, data: { id: "call-1", callTopic: "Discovery", durationSeconds: 120, transcript: [
      { timestampSeconds: 0, speaker: "Speaker A", text: "Tell me more" },
      { timestampSeconds: 10, speaker: "Speaker B", text: "I need implementation proof" },
    ] } });
    extractBuyerPersonalityFromTranscript.mockResolvedValue({ model: "gpt-5-mini", profile });
    repository.updateBuyerPersonalityProfile.mockResolvedValue(undefined);
  });

  it("rebuilds and persists the profile with an explicit buyer speaker", async () => {
    const route = await import("../app/api/calls/[id]/buyer-personality/route");
    const response = await route.POST(new Request("http://localhost/api/calls/call-1/buyer-personality", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyerSpeakerLabel: "Speaker B" }),
    }), { params: Promise.resolve({ id: "call-1" }) });
    expect(response.status).toBe(200);
    expect(extractBuyerPersonalityFromTranscript).toHaveBeenCalledWith(expect.objectContaining({ buyerSpeakerOverride: "Speaker B" }));
    expect(repository.updateBuyerPersonalityProfile).toHaveBeenCalledWith(expect.objectContaining({ callId: "call-1", status: "ready", profile }));
  });

  it("rejects a speaker label absent from the organization-scoped transcript", async () => {
    const route = await import("../app/api/calls/[id]/buyer-personality/route");
    const response = await route.POST(new Request("http://localhost/api/calls/call-1/buyer-personality", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyerSpeakerLabel: "Speaker Z" }),
    }), { params: Promise.resolve({ id: "call-1" }) });
    expect(response.status).toBe(422);
    expect(extractBuyerPersonalityFromTranscript).not.toHaveBeenCalled();
  });
});
