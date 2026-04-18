import { describe, expect, it, vi } from "vitest";
import { type CallsRepository, uploadCall } from "./calls/service";

function createRepository(
  overrides: Partial<CallsRepository> = {},
): CallsRepository {
  return {
    createCall: vi.fn(),
    createNotification: vi.fn(),
    deleteAnnotation: vi.fn(),
    findAnnotations: vi.fn(),
    findCallById: vi.fn(),
    findCallsByOrgId: vi.fn(),
    findCallsByRepId: vi.fn(),
    findCallsByRepIds: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findHighlightsByOrgId: vi.fn(),
    findHighlightsByRepId: vi.fn(),
    findScoreTrend: vi.fn(),
    insertAnnotation: vi.fn(),
    setCallEvaluation: vi.fn(),
    updateCallStatus: vi.fn(),
    updateCallTopic: vi.fn(),
    updateMomentHighlight: vi.fn(),
    ...overrides,
  } as unknown as CallsRepository;
}

describe("uploadCall", () => {
  it("marks the call failed if evaluation crashes after the record is created", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      createCall: vi.fn().mockResolvedValue({
        id: "call-1",
        status: "evaluating",
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
      setCallEvaluation: vi.fn().mockRejectedValue(new Error("transcriber unavailable")),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      uploadCall(repository, "rep-1", {
        fileName: "discovery-call.mp3",
        fileSizeBytes: 10 * 1024 * 1024,
        callTopic: "Discovery call",
      }),
    ).rejects.toThrow("transcriber unavailable");

    expect(repository.updateCallStatus).toHaveBeenCalledWith("call-1", "failed");
  });

  it("does not fail the upload when notification delivery fails after scoring", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      createCall: vi.fn().mockResolvedValue({
        id: "call-1",
        status: "evaluating",
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
      setCallEvaluation: vi.fn().mockResolvedValue(undefined),
      createNotification: vi.fn().mockRejectedValue(new Error("notifications offline")),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    });

    const result = await uploadCall(repository, "rep-1", {
      fileName: "discovery-call.mp3",
      fileSizeBytes: 10 * 1024 * 1024,
      callTopic: "Discovery call",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected upload success");
    }
    expect(result.data.id).toBe("call-1");
    expect(repository.updateCallStatus).not.toHaveBeenCalled();
  });
});
