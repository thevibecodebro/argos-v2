import { GoogleWorkspaceApiError } from "@argos-v2/google-workspace-client";
import { describe, expect, it, vi } from "vitest";
import { pollGoogleMeetImports } from "./poll-google-meet-imports";

const claimed = {
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

function createRepository(overrides: Record<string, unknown> = {}) {
  return {
    claimNextGoogleMeetImport: vi.fn().mockResolvedValue(claimed),
    createCallForGoogleMeetImport: vi.fn(),
    createOrResetCallProcessingJob: vi.fn(),
    findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
    findActiveRubricIdByOrgId: vi.fn(),
    findGoogleMeetIntegrationForImport: vi.fn().mockResolvedValue({
      accessToken: "google-access",
      consentConfirmedAt: new Date(),
      defaultRepId: "rep-1",
      id: "integration-1",
      orgId: "org-1",
      refreshToken: "google-refresh",
      syncEnabled: true,
      tokenExpiresAt: new Date(Date.now() + 3_600_000),
    }),
    getIngestionTitleFilterConfig: vi.fn().mockResolvedValue({
      configured: true,
      excludePhrases: [],
      includePhrases: ["demo"],
    }),
    markGoogleMeetImportFailed: vi.fn(),
    markGoogleMeetImportImported: vi.fn(),
    markGoogleMeetImportRetryable: vi.fn(),
    markGoogleMeetImportSkipped: vi.fn(),
    updateCallRecordingStorage: vi.fn(),
    updateGoogleMeetTokens: vi.fn(),
    ...overrides,
  };
}

describe("pollGoogleMeetImports", () => {
  it("schedules retryable Google API failures without creating duplicate calls", async () => {
    const repository = createRepository();
    const providerError = new GoogleWorkspaceApiError("Drive files.download", 503);

    await pollGoogleMeetImports({
      clientId: "google-client",
      clientSecret: "google-secret",
      createClient: vi.fn().mockReturnValue({
        downloadDriveFile: vi.fn().mockRejectedValue(providerError),
      }),
      maxSourceBytes: 500_000_000,
      once: true,
      repository: repository as never,
    });

    expect(repository.markGoogleMeetImportRetryable).toHaveBeenCalledWith(
      claimed,
      providerError.message,
    );
    expect(repository.createCallForGoogleMeetImport).not.toHaveBeenCalled();
    expect(repository.markGoogleMeetImportFailed).not.toHaveBeenCalled();
  });

  it("marks terminal authorization failures skipped after refresh", async () => {
    const repository = createRepository({
      findGoogleMeetIntegrationForImport: vi.fn().mockResolvedValue({
        accessToken: "expired-access",
        consentConfirmedAt: new Date(),
        defaultRepId: "rep-1",
        id: "integration-1",
        orgId: "org-1",
        refreshToken: "google-refresh",
        syncEnabled: true,
        tokenExpiresAt: new Date(0),
      }),
    });

    await pollGoogleMeetImports({
      clientId: "google-client",
      clientSecret: "google-secret",
      maxSourceBytes: 500_000_000,
      once: true,
      refreshTokens: vi.fn().mockRejectedValue(
        new GoogleWorkspaceApiError("OAuth token refresh", 401),
      ),
      repository: repository as never,
    });

    expect(repository.markGoogleMeetImportSkipped).toHaveBeenCalledWith(
      "import-1",
      { reason: "unauthorized_after_refresh" },
    );
    expect(repository.markGoogleMeetImportRetryable).not.toHaveBeenCalled();
  });
});
