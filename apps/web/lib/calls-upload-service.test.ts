import { describe, expect, it, vi } from "vitest";
import { type CallsRepository, uploadCall } from "./calls/service";

function createRepository(
  overrides: Partial<CallsRepository> = {},
): CallsRepository {
  return {
    createCall: vi.fn(),
    createNotification: vi.fn(),
    createOrResetCallProcessingJob: vi.fn(),
    deleteCall: vi.fn(),
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
    updateCallRecording: vi.fn(),
    updateCallStatus: vi.fn(),
    updateCallTopic: vi.fn(),
    updateMomentHighlight: vi.fn(),
    ...overrides,
  } as unknown as CallsRepository;
}

describe("uploadCall", () => {
  it("stores the source asset and queues a processing job instead of scoring inline", async () => {
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
        status: "uploaded",
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
    });
    const storeSourceAsset = vi.fn().mockResolvedValue({
      storagePath: "recordings/call-1/source/demo.mp3",
      publicUrl: "https://storage.example/call-1/demo.mp3",
    });

    const result = await uploadCall(
      repository,
      "rep-1",
      {
        fileName: "demo.mp3",
        fileSizeBytes: 12_000_000,
        callTopic: "Discovery",
        recording: {
          bytes: Buffer.from("fake audio"),
          contentType: "audio/mpeg",
        },
      },
      {
        storeSourceAsset,
      },
    );

    expect(result.ok && result.data.status).toBe("uploaded");
    expect(storeSourceAsset).toHaveBeenCalledTimes(1);
    expect(repository.updateCallRecording).toHaveBeenCalledWith(
      "call-1",
      "https://storage.example/call-1/demo.mp3",
    );
    expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: "call-1",
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/call-1/source/demo.mp3",
      }),
    );
    expect(repository.setCallEvaluation).not.toHaveBeenCalled();
    expect(repository.createNotification).not.toHaveBeenCalled();
  });

  it("marks the call failed if queueing crashes after the record is created", async () => {
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
        status: "uploaded",
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    });
    const storeSourceAsset = vi.fn().mockRejectedValue(new Error("storage offline"));

    await expect(
      uploadCall(
        repository,
        "rep-1",
        {
          fileName: "demo.mp3",
          fileSizeBytes: 12_000_000,
          callTopic: "Discovery",
          recording: {
            bytes: Buffer.from("fake audio"),
            contentType: "audio/mpeg",
          },
        },
        {
          storeSourceAsset,
        },
      ),
    ).rejects.toThrow("storage offline");

    expect(repository.updateCallStatus).toHaveBeenCalledWith("call-1", "failed");
    expect(repository.setCallEvaluation).not.toHaveBeenCalled();
  });

  it("deletes the call if queueing cleanup cannot mark it failed", async () => {
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
        status: "uploaded",
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
      updateCallStatus: vi.fn().mockRejectedValue(new Error("write unavailable")),
      deleteCall: vi.fn().mockResolvedValue(undefined),
    });
    const storeSourceAsset = vi.fn().mockRejectedValue(new Error("storage offline"));

    await expect(
      uploadCall(
        repository,
        "rep-1",
        {
          fileName: "demo.mp3",
          fileSizeBytes: 12_000_000,
          callTopic: "Discovery",
          recording: {
            bytes: Buffer.from("fake audio"),
            contentType: "audio/mpeg",
          },
        },
        {
          storeSourceAsset,
        },
      ),
    ).rejects.toThrow("storage offline");

    expect(repository.updateCallStatus).toHaveBeenCalledWith("call-1", "failed");
    expect(repository.deleteCall).toHaveBeenCalledWith("call-1");
  });
});
