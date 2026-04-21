import { describe, expect, it, vi } from "vitest";
import { completeUploadedCall, type CallsRepository, uploadCall } from "./calls/service";
import type { RubricsRepository } from "./rubrics/service";

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

function createRubricsRepository(
  overrides: Partial<RubricsRepository> = {},
): RubricsRepository {
  return {
    createDraftRubric: vi.fn(),
    findActiveRubricByOrgId: vi.fn().mockResolvedValue(null),
    findRubricHistoryByOrgId: vi.fn(),
    findCategoriesByRubricId: vi.fn(),
    publishDraftRubric: vi.fn(),
    ...overrides,
  } as unknown as RubricsRepository;
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
    const rubricsRepository = createRubricsRepository({
      findActiveRubricByOrgId: vi.fn().mockResolvedValue({
        id: "rubric-1",
        orgId: "org-1",
        name: "Revenue Scorecard",
        description: null,
        sourceType: "manual",
        status: "active",
        version: 1,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        publishedAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
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
        rubricsRepository,
        storeSourceAsset,
      },
    );

    expect(result.ok && result.data.status).toBe("uploaded");
    expect(storeSourceAsset).toHaveBeenCalledTimes(1);
    expect(repository.updateCallRecording).toHaveBeenCalledWith(
      "call-1",
      "https://storage.example/call-1/demo.mp3",
    );
    expect(repository.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        rubricId: "rubric-1",
      }),
    );
    expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: "call-1",
        rubricId: "rubric-1",
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
    const rubricsRepository = createRubricsRepository();

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
          rubricsRepository,
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
    const rubricsRepository = createRubricsRepository();

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
          rubricsRepository,
          storeSourceAsset,
        },
      ),
    ).rejects.toThrow("storage offline");

    expect(repository.updateCallStatus).toHaveBeenCalledWith("call-1", "failed");
    expect(repository.deleteCall).toHaveBeenCalledWith("call-1");
  });
});

describe("completeUploadedCall", () => {
  it("creates a queued call from a pre-uploaded source asset", async () => {
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
    const rubricsRepository = createRubricsRepository({
      findActiveRubricByOrgId: vi.fn().mockResolvedValue({
        id: "rubric-1",
        orgId: "org-1",
        name: "Revenue Scorecard",
        description: null,
        sourceType: "manual",
        status: "active",
        version: 1,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        publishedAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
    });

    const result = await completeUploadedCall(
      repository,
      "rep-1",
      {
        fileName: "demo.mp3",
        fileSizeBytes: 12_000_000,
        callTopic: "Discovery",
        sourceAsset: {
          storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
          publicUrl: "https://storage.example/manual/demo.mp3",
          contentType: "audio/mpeg",
        },
      },
      {
        rubricsRepository,
      },
    );

    expect(result.ok && result.data.status).toBe("uploaded");
    expect(repository.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        rubricId: "rubric-1",
      }),
    );
    expect(repository.updateCallRecording).toHaveBeenCalledWith(
      "call-1",
      "https://storage.example/manual/demo.mp3",
    );
    expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: "call-1",
        rubricId: "rubric-1",
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      }),
    );
  });

  it("marks the call failed if queueing the pre-uploaded source asset crashes", async () => {
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
      updateCallRecording: vi.fn().mockRejectedValue(new Error("write unavailable")),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    });
    const rubricsRepository = createRubricsRepository();

    await expect(
      completeUploadedCall(
        repository,
        "rep-1",
        {
          fileName: "demo.mp3",
          fileSizeBytes: 12_000_000,
          callTopic: "Discovery",
          sourceAsset: {
            storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
            publicUrl: "https://storage.example/manual/demo.mp3",
            contentType: "audio/mpeg",
          },
        },
        {
          rubricsRepository,
        },
      ),
    ).rejects.toThrow("write unavailable");

    expect(repository.updateCallStatus).toHaveBeenCalledWith("call-1", "failed");
  });
});
