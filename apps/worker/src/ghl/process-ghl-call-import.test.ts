import { describe, expect, it, vi } from "vitest";
import { processGhlCallImport, type GhlCallImportRepository } from "./process-ghl-call-import";

function createRepository(
  overrides: Partial<GhlCallImportRepository> = {},
): GhlCallImportRepository {
  return {
    createCallForGhlImport: vi.fn(),
    createOrResetCallProcessingJob: vi.fn(),
    findArgosUserIdForGhlUser: vi.fn(),
    findGhlIntegrationForImport: vi.fn(),
    markGhlCallImportFailed: vi.fn(),
    markGhlCallImportImported: vi.fn(),
    markGhlCallImportSkipped: vi.fn(),
    updateCallRecordingStorage: vi.fn(),
    updateGhlTokens: vi.fn(),
    ...overrides,
  };
}

describe("processGhlCallImport", () => {
  it("downloads a GHL recording, stores it, creates the call, and queues processing", async () => {
    const repository = createRepository({
      findGhlIntegrationForImport: vi.fn().mockResolvedValue({
        orgId: "org-1",
        locationId: "loc-1",
        accessToken: "ghl-access",
        refreshToken: "ghl-refresh",
        tokenExpiresAt: new Date("2026-06-18T13:00:00.000Z"),
        syncEnabled: true,
        consentConfirmedAt: new Date("2026-06-18T12:00:00.000Z"),
        defaultRepId: "fallback-rep-1",
      }),
      findArgosUserIdForGhlUser: vi.fn().mockResolvedValue("rep-1"),
      createCallForGhlImport: vi.fn().mockResolvedValue({ id: "call-1" }),
    });
    const leadConnector = {
      getMessage: vi.fn().mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
        contactId: "contact-1",
        userId: "ghl-user-1",
        direction: "outbound",
        type: "CALL",
        dateAdded: "2026-06-18T12:00:00.000Z",
      }),
      downloadMessageRecording: vi.fn().mockResolvedValue({
        bytes: Buffer.from("wav audio"),
        contentType: "audio/x-wav",
        fileName: "msg-1.wav",
      }),
    };
    const storeSourceAsset = vi.fn().mockResolvedValue({
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/msg-1.wav",
      contentType: "audio/x-wav",
      fileSizeBytes: 9,
    });
    const getActiveRubricId = vi.fn().mockResolvedValue("rubric-1");

    await processGhlCallImport({
      importRecord: {
        id: "import-1",
        orgId: "org-1",
        locationId: "loc-1",
        messageId: "msg-1",
        conversationId: "conv-1",
        contactId: "contact-1",
        ghlUserId: "ghl-user-1",
        callId: null,
        status: "running",
        attemptCount: 1,
        maxAttempts: 3,
      },
      repository,
      leadConnector,
      storeSourceAsset,
      getActiveRubricId,
    });

    expect(leadConnector.getMessage).toHaveBeenCalledWith("msg-1");
    expect(leadConnector.downloadMessageRecording).toHaveBeenCalledWith({
      locationId: "loc-1",
      messageId: "msg-1",
    });
    expect(repository.createCallForGhlImport).toHaveBeenCalledWith({
      importId: "import-1",
      orgId: "org-1",
      repId: "rep-1",
      rubricId: "rubric-1",
      callTopic: "GHL outbound call",
      consentConfirmed: true,
      messageId: "msg-1",
      conversationId: "conv-1",
      contactId: "contact-1",
      ghlUserId: "ghl-user-1",
      messageCreatedAt: new Date("2026-06-18T12:00:00.000Z"),
    });
    expect(storeSourceAsset).toHaveBeenCalledWith({
      callId: "call-1",
      bytes: Buffer.from("wav audio"),
      contentType: "audio/x-wav",
      fileName: "msg-1.wav",
    });
    expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith({
      callId: "call-1",
      rubricId: "rubric-1",
      sourceOrigin: "ghl_recording",
      sourceStoragePath: "recordings/call-1/source/msg-1.wav",
      sourceFileName: "msg-1.wav",
      sourceContentType: "audio/x-wav",
      sourceSizeBytes: 9,
    });
    expect(repository.markGhlCallImportImported).toHaveBeenCalledWith("import-1", {
      callId: "call-1",
    });
  });

  it("skips imports when consent has not been acknowledged", async () => {
    const repository = createRepository({
      findGhlIntegrationForImport: vi.fn().mockResolvedValue({
        orgId: "org-1",
        locationId: "loc-1",
        accessToken: "ghl-access",
        refreshToken: "ghl-refresh",
        tokenExpiresAt: new Date("2026-06-18T13:00:00.000Z"),
        syncEnabled: true,
        consentConfirmedAt: null,
        defaultRepId: "fallback-rep-1",
      }),
    });

    await processGhlCallImport({
      importRecord: {
        id: "import-1",
        orgId: "org-1",
        locationId: "loc-1",
        messageId: "msg-1",
        conversationId: "conv-1",
        contactId: null,
        ghlUserId: null,
        callId: null,
        status: "running",
        attemptCount: 1,
        maxAttempts: 3,
      },
      repository,
      leadConnector: {
        getMessage: vi.fn(),
        downloadMessageRecording: vi.fn(),
      },
      storeSourceAsset: vi.fn(),
      getActiveRubricId: vi.fn(),
    });

    expect(repository.markGhlCallImportSkipped).toHaveBeenCalledWith("import-1", {
      reason: "consent_missing",
    });
  });
});
