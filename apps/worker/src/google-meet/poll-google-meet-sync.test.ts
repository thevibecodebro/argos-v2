import { describe, expect, it, vi } from "vitest";
import { pollGoogleMeetSync } from "./poll-google-meet-sync";

describe("pollGoogleMeetSync", () => {
  it("refreshes expired organizer tokens before listing Google metadata", async () => {
    const now = new Date();
    const repository = {
      organizationHasIntegrationCapability: vi.fn().mockResolvedValue(true),
      getIngestionTitleFilterConfig: vi.fn().mockResolvedValue({
        configured: true,
        excludePhrases: [],
        includePhrases: ["demo"],
      }),
      listDueGoogleMeetSyncIntegrations: vi.fn().mockResolvedValue([
        {
          accessToken: "expired-access",
          id: "integration-1",
          lastSyncCursor: null,
          orgId: "org-1",
          refreshToken: "google-refresh",
          tokenExpiresAt: new Date(now.getTime() - 60_000),
        },
      ]),
      markGoogleMeetSyncCompleted: vi.fn(),
      markGoogleMeetSyncFailed: vi.fn(),
      markGoogleMeetSyncStarted: vi.fn(),
      updateGoogleMeetTokens: vi.fn(),
      upsertGoogleMeetImport: vi.fn(),
    };
    const refreshTokens = vi.fn().mockResolvedValue({
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
      tokenExpiresAt: new Date(now.getTime() + 3_600_000),
    });
    const client = {
      getDriveFileMetadata: vi.fn(),
      getMeetingSpace: vi.fn(),
      listConferenceRecordings: vi.fn(),
      listConferenceRecords: vi.fn().mockResolvedValue({
        conferenceRecords: [],
        nextPageToken: null,
      }),
      listPrimaryCalendarEvents: vi.fn().mockResolvedValue({
        events: [],
        nextPageToken: null,
      }),
    };
    const createClient = vi.fn().mockReturnValue(client);

    await pollGoogleMeetSync({
      clientId: "google-client",
      clientSecret: "google-secret",
      createClient,
      once: true,
      refreshTokens,
      repository: repository as never,
    });

    expect(refreshTokens).toHaveBeenCalledWith({
      clientId: "google-client",
      clientSecret: "google-secret",
      refreshToken: "google-refresh",
    });
    expect(repository.updateGoogleMeetTokens).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ accessToken: "fresh-access" }),
    );
    expect(createClient).toHaveBeenCalledWith("fresh-access");
    expect(repository.markGoogleMeetSyncCompleted).toHaveBeenCalledWith(
      "org-1",
      { cursor: expect.any(Date) },
    );
  });
});
