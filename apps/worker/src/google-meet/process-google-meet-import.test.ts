import { describe, expect, it, vi } from "vitest";
import {
  processGoogleMeetImport,
  type GoogleMeetImportRepository,
} from "./process-google-meet-import";

function createRepository(
  overrides: Partial<GoogleMeetImportRepository> = {},
): GoogleMeetImportRepository {
  return {
    organizationHasIntegrationCapability: vi.fn().mockResolvedValue(true),
    createCallForGoogleMeetImport: vi.fn().mockResolvedValue({ id: "call-1" }),
    createOrResetCallProcessingJob: vi.fn(),
    findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
    findGoogleMeetIntegrationForImport: vi.fn().mockResolvedValue({
      consentConfirmedAt: new Date("2026-07-13T12:00:00.000Z"),
      defaultRepId: "rep-1",
      id: "integration-1",
      orgId: "org-1",
      syncEnabled: true,
    }),
    getIngestionTitleFilterConfig: vi.fn().mockResolvedValue({
      configured: true,
      excludePhrases: ["internal"],
      includePhrases: ["demo"],
    }),
    markGoogleMeetImportImported: vi.fn(),
    markGoogleMeetImportSkipped: vi.fn(),
    updateCallRecordingStorage: vi.fn(),
    ...overrides,
  };
}

const importRecord = {
  attemptCount: 1,
  callId: null,
  driveFileId: "drive-1",
  id: "import-1",
  integrationId: "integration-1",
  maxAttempts: 3,
  meetingTitle: "Acme Product Demo",
  orgId: "org-1",
  recordingName: "conferenceRecords/conf-1/recordings/recording-1",
};

describe("processGoogleMeetImport", () => {
  it("skips before provider access when the platform revoked Google Meet", async () => {
    const repository = createRepository({
      organizationHasIntegrationCapability: vi.fn().mockResolvedValue(false),
    });
    const client = { downloadDriveFile: vi.fn() };

    await processGoogleMeetImport({
      client,
      getActiveRubricId: vi.fn(),
      importRecord,
      maxSourceBytes: 10_000,
      repository,
      storeSourceAsset: vi.fn(),
    });

    expect(repository.markGoogleMeetImportSkipped).toHaveBeenCalledWith(
      "import-1",
      { reason: "capability_disabled" },
    );
    expect(client.downloadDriveFile).not.toHaveBeenCalled();
  });
  it("downloads an accepted MP4, stores it, creates one call, and queues one processing job", async () => {
    const repository = createRepository();
    const client = {
      downloadDriveFile: vi.fn().mockResolvedValue({
        bytes: Buffer.from("mp4 bytes"),
        contentType: "video/mp4",
      }),
    };
    const storeSourceAsset = vi.fn().mockResolvedValue({
      contentType: "video/mp4",
      fileSizeBytes: 9,
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/google-meet-recording-1.mp4",
    });

    await processGoogleMeetImport({
      client,
      getActiveRubricId: vi.fn().mockResolvedValue("rubric-1"),
      importRecord,
      maxSourceBytes: 500_000_000,
      repository,
      storeSourceAsset,
    });

    expect(client.downloadDriveFile).toHaveBeenCalledWith({
      fileId: "drive-1",
      maxBytes: 500_000_000,
    });
    expect(repository.createCallForGoogleMeetImport).toHaveBeenCalledOnce();
    expect(repository.createCallForGoogleMeetImport).toHaveBeenCalledWith({
      consentConfirmed: true,
      importId: "import-1",
      meetingTitle: "Acme Product Demo",
      orgId: "org-1",
      repId: "rep-1",
      rubricId: "rubric-1",
    });
    expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledOnce();
    expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith({
      callId: "call-1",
      rubricId: "rubric-1",
      sourceContentType: "video/mp4",
      sourceFileName: "google-meet-recording-1.mp4",
      sourceOrigin: "google_meet_recording",
      sourceSizeBytes: 9,
      sourceStoragePath: "recordings/call-1/source/google-meet-recording-1.mp4",
    });
    expect(repository.markGoogleMeetImportImported).toHaveBeenCalledWith(
      "import-1",
      { callId: "call-1" },
    );
  });

  it("re-evaluates title rules before billing checks or recording download", async () => {
    const repository = createRepository({
      getIngestionTitleFilterConfig: vi.fn().mockResolvedValue({
        configured: true,
        excludePhrases: ["internal"],
        includePhrases: ["demo"],
      }),
    });
    const client = { downloadDriveFile: vi.fn() };

    await processGoogleMeetImport({
      client,
      getActiveRubricId: vi.fn(),
      importRecord: {
        ...importRecord,
        meetingTitle: "Internal Demo Practice",
      },
      maxSourceBytes: 500_000_000,
      repository,
      storeSourceAsset: vi.fn(),
    });

    expect(repository.markGoogleMeetImportSkipped).toHaveBeenCalledWith(
      "import-1",
      { reason: "title_excluded" },
    );
    expect(repository.findActiveCallProcessingSubscription).not.toHaveBeenCalled();
    expect(client.downloadDriveFile).not.toHaveBeenCalled();
    expect(repository.createCallForGoogleMeetImport).not.toHaveBeenCalled();
  });

  it("skips before download when consent, owner, or billing is unavailable", async () => {
    const noConsent = createRepository({
      findGoogleMeetIntegrationForImport: vi.fn().mockResolvedValue({
        consentConfirmedAt: null,
        defaultRepId: "rep-1",
        id: "integration-1",
        orgId: "org-1",
        syncEnabled: true,
      }),
    });
    const client = { downloadDriveFile: vi.fn() };

    await processGoogleMeetImport({
      client,
      getActiveRubricId: vi.fn(),
      importRecord,
      maxSourceBytes: 500_000_000,
      repository: noConsent,
      storeSourceAsset: vi.fn(),
    });

    expect(noConsent.markGoogleMeetImportSkipped).toHaveBeenCalledWith(
      "import-1",
      { reason: "consent_missing" },
    );
    expect(client.downloadDriveFile).not.toHaveBeenCalled();
  });
});
