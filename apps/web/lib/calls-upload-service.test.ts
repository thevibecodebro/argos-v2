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
    findCallProcessingJobBySourceStoragePath: vi.fn().mockResolvedValue(null),
    findCurrentUserByAuthId: vi.fn(),
    findHighlightsByOrgId: vi.fn(),
    findHighlightsByRepId: vi.fn(),
    findScoreTrend: vi.fn(),
    insertAnnotation: vi.fn(),
    setCallEvaluation: vi.fn(),
    updateCallRecording: vi.fn(),
    updateCallRecordingStorage: vi.fn(),
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
  it("blocks unpaid workspaces before storing source assets or queueing processing", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      createCall: vi.fn(),
      createOrResetCallProcessingJob: vi.fn(),
    });
    const storeSourceAsset = vi.fn();
    const callProcessingEntitlementsRepository = {
      findActiveCallProcessingSubscription: vi.fn().mockResolvedValue(null),
    };

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
        callProcessingEntitlementsRepository,
        rubricsRepository: createRubricsRepository(),
        storeSourceAsset,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 402,
      code: "payment_required",
    });
    expect(callProcessingEntitlementsRepository.findActiveCallProcessingSubscription).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: "rep-1",
    });
    expect(repository.createCall).not.toHaveBeenCalled();
    expect(storeSourceAsset).not.toHaveBeenCalled();
    expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
  });

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
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
    });
    const storeSourceAsset = vi.fn().mockResolvedValue({
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/demo.mp3",
      contentType: "audio/mpeg",
      fileSizeBytes: 10,
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
        callProcessingEntitlementsRepository: {
          findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
        },
        rubricsRepository,
        storeSourceAsset,
      },
    );

    expect(result.ok && result.data.status).toBe("uploaded");
    expect(storeSourceAsset).toHaveBeenCalledTimes(1);
    expect(repository.updateCallRecording).not.toHaveBeenCalled();
    expect(repository.updateCallRecordingStorage).toHaveBeenCalledWith("call-1", {
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/demo.mp3",
      contentType: "audio/mpeg",
      fileSizeBytes: 10,
    });
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
          callProcessingEntitlementsRepository: {
            findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
          },
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
          callProcessingEntitlementsRepository: {
            findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
          },
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
  it("blocks unpaid workspaces before creating queued calls from pre-uploaded assets", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      createCall: vi.fn(),
      createOrResetCallProcessingJob: vi.fn(),
    });
    const callProcessingEntitlementsRepository = {
      findActiveCallProcessingSubscription: vi.fn().mockResolvedValue(null),
    };

    const result = await completeUploadedCall(
      repository,
      "rep-1",
      {
        fileName: "demo.mp3",
        fileSizeBytes: 12_000_000,
        callTopic: "Discovery",
        sourceAsset: {
          storageBucket: "call-recordings",
          storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
          contentType: "audio/mpeg",
          fileSizeBytes: 12_000_000,
        },
      },
      {
        callProcessingEntitlementsRepository,
        rubricsRepository: createRubricsRepository(),
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 402,
      code: "payment_required",
    });
    expect(callProcessingEntitlementsRepository.findActiveCallProcessingSubscription).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: "rep-1",
    });
    expect(repository.createCall).not.toHaveBeenCalled();
    expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
  });

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
          storageBucket: "call-recordings",
          storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
          contentType: "audio/mpeg",
          fileSizeBytes: 12_000_000,
        },
      },
      {
        callProcessingEntitlementsRepository: {
          findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
        },
        rubricsRepository,
      },
    );

    expect(result.ok && result.data.status).toBe("uploaded");
    expect(repository.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        rubricId: "rubric-1",
      }),
    );
    expect(repository.updateCallRecording).not.toHaveBeenCalled();
    expect(repository.updateCallRecordingStorage).toHaveBeenCalledWith("call-1", {
      storageBucket: "call-recordings",
      storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      contentType: "audio/mpeg",
      fileSizeBytes: 12_000_000,
    });
    expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: "call-1",
        rubricId: "rubric-1",
        sourceOrigin: "manual_upload",
        sourceStoragePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      }),
    );
  });

  it("rejects a replayed pre-uploaded source asset before creating another queued call", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallProcessingJobBySourceStoragePath: vi.fn().mockResolvedValue({
        id: "job-1",
        status: "pending",
        attemptCount: 0,
        maxAttempts: 3,
        nextRunAt: new Date("2026-04-17T00:00:00.000Z"),
        lastStage: null,
        lastError: null,
        updatedAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
      createCall: vi.fn(),
      createOrResetCallProcessingJob: vi.fn(),
      updateCallRecordingStorage: vi.fn(),
    });

    const result = await completeUploadedCall(
      repository,
      "rep-1",
      {
        fileName: "demo.mp3",
        fileSizeBytes: 12_000_000,
        callTopic: "Discovery",
        sourceAsset: {
          storageBucket: "call-recordings",
          storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
          contentType: "audio/mpeg",
          fileSizeBytes: 12_000_000,
        },
      },
      {
        callProcessingEntitlementsRepository: {
          findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
        },
        rubricsRepository: createRubricsRepository(),
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: "invalid_state",
    });
    expect(repository.findCallProcessingJobBySourceStoragePath).toHaveBeenCalledWith(
      "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
    );
    expect(repository.createCall).not.toHaveBeenCalled();
    expect(repository.updateCallRecordingStorage).not.toHaveBeenCalled();
    expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
  });

  it("returns a conflict when concurrent replay is rejected by the source asset uniqueness guard", async () => {
    const duplicateSourceError = new Error(
      'duplicate key value violates unique constraint "call_processing_jobs_manual_source_storage_path_uq"',
    );
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallProcessingJobBySourceStoragePath: vi.fn().mockResolvedValue(null),
      createCall: vi.fn().mockResolvedValue({
        id: "call-2",
        status: "uploaded",
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
      createOrResetCallProcessingJob: vi.fn().mockRejectedValue(duplicateSourceError),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    });

    const result = await completeUploadedCall(
      repository,
      "rep-1",
      {
        fileName: "demo.mp3",
        fileSizeBytes: 12_000_000,
        callTopic: "Discovery",
        sourceAsset: {
          storageBucket: "call-recordings",
          storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
          contentType: "audio/mpeg",
          fileSizeBytes: 12_000_000,
        },
      },
      {
        callProcessingEntitlementsRepository: {
          findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
        },
        rubricsRepository: createRubricsRepository(),
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: "invalid_state",
    });
    expect(repository.createCall).toHaveBeenCalledOnce();
    expect(repository.updateCallStatus).toHaveBeenCalledWith("call-2", "failed");
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
      updateCallRecordingStorage: vi.fn().mockRejectedValue(new Error("write unavailable")),
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
            storageBucket: "call-recordings",
            storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
            contentType: "audio/mpeg",
            fileSizeBytes: 12_000_000,
          },
        },
        {
          callProcessingEntitlementsRepository: {
            findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
          },
          rubricsRepository,
        },
      ),
    ).rejects.toThrow("write unavailable");

    expect(repository.updateCallStatus).toHaveBeenCalledWith("call-1", "failed");
  });
});
