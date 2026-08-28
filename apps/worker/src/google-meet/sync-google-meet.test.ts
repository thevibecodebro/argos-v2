import { describe, expect, it, vi } from "vitest";
import {
  syncGoogleMeetIntegration,
  type GoogleMeetSyncRepository,
} from "./sync-google-meet";

function createRepository(
  overrides: Partial<GoogleMeetSyncRepository> = {},
): GoogleMeetSyncRepository {
  return {
    organizationHasIntegrationCapability: vi.fn().mockResolvedValue(true),
    getIngestionTitleFilterConfig: vi.fn().mockResolvedValue({
      configured: true,
      excludePhrases: ["internal"],
      includePhrases: ["demo"],
    }),
    upsertGoogleMeetImport: vi.fn(),
    ...overrides,
  };
}

const integration = {
  accessToken: "google-access",
  id: "integration-1",
  lastSyncCursor: null,
  orgId: "org-1",
};

describe("syncGoogleMeetIntegration", () => {
  it("correlates a Meet space to a Calendar title and queues accepted recording metadata", async () => {
    const repository = createRepository();
    const client = {
      getDriveFileMetadata: vi.fn(),
      getMeetingSpace: vi.fn().mockResolvedValue({
        meetingCode: "abc-defg-hij",
        name: "spaces/space-1",
      }),
      listConferenceRecordings: vi.fn().mockResolvedValue({
        nextPageToken: null,
        recordings: [
          {
            driveDestination: { exportUri: null, file: "files/drive-1" },
            endTime: "2026-07-13T12:55:00.000Z",
            name: "conferenceRecords/conf-1/recordings/recording-1",
            startTime: "2026-07-13T12:05:00.000Z",
            state: "FILE_GENERATED",
          },
        ],
      }),
      listConferenceRecords: vi.fn().mockResolvedValue({
        conferenceRecords: [
          {
            endTime: "2026-07-13T13:00:00.000Z",
            name: "conferenceRecords/conf-1",
            space: "spaces/space-1",
            startTime: "2026-07-13T12:00:00.000Z",
          },
        ],
        nextPageToken: null,
      }),
      listPrimaryCalendarEvents: vi.fn().mockResolvedValue({
        events: [
          {
            conferenceData: {
              conferenceId: "abc-defg-hij",
              conferenceSolutionKeyType: "hangoutsMeet",
              entryPoints: [],
            },
            end: null,
            hangoutLink: "https://meet.google.com/abc-defg-hij",
            id: "event-1",
            start: null,
            summary: "Acme Product Demo",
          },
        ],
        nextPageToken: null,
      }),
    };
    const now = new Date("2026-07-13T14:00:00.000Z");

    const result = await syncGoogleMeetIntegration({
      client,
      integration,
      now,
      repository,
    });

    expect(client.listConferenceRecords).toHaveBeenCalledWith({
      endTime: now,
      pageToken: null,
      startTime: new Date("2026-07-06T14:00:00.000Z"),
    });
    expect(client.getDriveFileMetadata).not.toHaveBeenCalled();
    expect(repository.upsertGoogleMeetImport).toHaveBeenCalledWith({
      conferenceEndedAt: new Date("2026-07-13T13:00:00.000Z"),
      conferenceRecordName: "conferenceRecords/conf-1",
      conferenceStartedAt: new Date("2026-07-13T12:00:00.000Z"),
      driveFileId: "drive-1",
      integrationId: "integration-1",
      meetingCode: "abc-defg-hij",
      meetingTitle: "Acme Product Demo",
      orgId: "org-1",
      recordingName: "conferenceRecords/conf-1/recordings/recording-1",
      skippedReason: null,
      status: "pending",
      titleSource: "calendar",
    });
    expect(result.cursor).toEqual(now);
  });

  it("uses the Drive filename for ad hoc meetings and records excluded artifacts without downloading", async () => {
    const repository = createRepository();
    const client = {
      getDriveFileMetadata: vi.fn().mockResolvedValue({
        id: "drive-1",
        mimeType: "video/mp4",
        name: "Internal customer demo.mp4",
        size: 1200,
      }),
      getMeetingSpace: vi.fn().mockResolvedValue({
        meetingCode: "ad-hoc-code",
        name: "spaces/space-1",
      }),
      listConferenceRecordings: vi.fn().mockResolvedValue({
        nextPageToken: null,
        recordings: [
          {
            driveDestination: { exportUri: null, file: "files/drive-1" },
            endTime: null,
            name: "conferenceRecords/conf-1/recordings/recording-1",
            startTime: null,
            state: "FILE_GENERATED",
          },
        ],
      }),
      listConferenceRecords: vi.fn().mockResolvedValue({
        conferenceRecords: [
          {
            endTime: "2026-07-13T13:00:00.000Z",
            name: "conferenceRecords/conf-1",
            space: "spaces/space-1",
            startTime: "2026-07-13T12:00:00.000Z",
          },
        ],
        nextPageToken: null,
      }),
      listPrimaryCalendarEvents: vi.fn().mockResolvedValue({
        events: [],
        nextPageToken: null,
      }),
    };

    await syncGoogleMeetIntegration({
      client,
      integration,
      now: new Date("2026-07-13T14:00:00.000Z"),
      repository,
    });

    expect(repository.upsertGoogleMeetImport).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingTitle: "Internal customer demo.mp4",
        skippedReason: "title_excluded",
        status: "skipped",
        titleSource: "drive",
      }),
    );
  });

  it("follows Calendar, conference, and recording pagination", async () => {
    const repository = createRepository();
    const client = {
      getDriveFileMetadata: vi.fn(),
      getMeetingSpace: vi.fn(),
      listConferenceRecordings: vi
        .fn()
        .mockResolvedValueOnce({ recordings: [], nextPageToken: "recordings-2" })
        .mockResolvedValueOnce({ recordings: [], nextPageToken: null }),
      listConferenceRecords: vi
        .fn()
        .mockResolvedValueOnce({
          conferenceRecords: [
            {
              endTime: "2026-07-13T13:00:00.000Z",
              name: "conferenceRecords/conf-1",
              space: null,
              startTime: "2026-07-13T12:00:00.000Z",
            },
          ],
          nextPageToken: "conferences-2",
        })
        .mockResolvedValueOnce({ conferenceRecords: [], nextPageToken: null }),
      listPrimaryCalendarEvents: vi
        .fn()
        .mockResolvedValueOnce({ events: [], nextPageToken: "calendar-2" })
        .mockResolvedValueOnce({ events: [], nextPageToken: null }),
    };

    await syncGoogleMeetIntegration({
      client,
      integration,
      now: new Date("2026-07-13T14:00:00.000Z"),
      repository,
    });

    expect(client.listPrimaryCalendarEvents).toHaveBeenCalledTimes(2);
    expect(client.listConferenceRecords).toHaveBeenCalledTimes(2);
    expect(client.listConferenceRecordings).toHaveBeenNthCalledWith(2, {
      conferenceRecordName: "conferenceRecords/conf-1",
      pageToken: "recordings-2",
    });
  });

  it("revisits recent conferences so delayed recordings can become ready", async () => {
    const repository = createRepository();
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
    const lastSyncCursor = new Date("2026-07-13T13:45:00.000Z");
    const now = new Date("2026-07-13T14:00:00.000Z");

    await syncGoogleMeetIntegration({
      client,
      integration: { ...integration, lastSyncCursor },
      now,
      repository,
    });

    expect(client.listConferenceRecords).toHaveBeenCalledWith({
      endTime: now,
      pageToken: null,
      startTime: new Date("2026-07-12T13:45:00.000Z"),
    });
  });
});
