import {
  evaluateIngestionTitleFilter,
  type IngestionTitleFilterConfig,
} from "@argos-v2/call-processing";
import {
  findCalendarEventTitleByMeetingCode,
  type GoogleCalendarEvent,
  type GoogleConferenceRecord,
  type GoogleDriveFileMetadata,
  type GoogleMeetRecording,
  type GoogleMeetSpace,
} from "@argos-v2/google-workspace-client";

export type GoogleMeetDiscoverySkippedReason =
  | "title_filter_unconfigured"
  | "title_missing"
  | "title_excluded"
  | "title_no_include_match"
  | "recording_not_ready";

export type GoogleMeetDiscoveredImport = {
  conferenceEndedAt: Date | null;
  conferenceRecordName: string;
  conferenceStartedAt: Date | null;
  driveFileId: string | null;
  integrationId: string;
  meetingCode: string | null;
  meetingTitle: string | null;
  orgId: string;
  recordingName: string;
  skippedReason: GoogleMeetDiscoverySkippedReason | null;
  status: "pending" | "skipped";
  titleSource: "calendar" | "drive" | null;
};

export type GoogleMeetSyncRepository = {
  getIngestionTitleFilterConfig(orgId: string): Promise<IngestionTitleFilterConfig>;
  organizationHasIntegrationCapability(orgId: string): Promise<boolean>;
  upsertGoogleMeetImport(input: GoogleMeetDiscoveredImport): Promise<void>;
};

export type GoogleMeetSyncClient = {
  getDriveFileMetadata(input: { fileId: string }): Promise<GoogleDriveFileMetadata>;
  getMeetingSpace(input: { spaceResource: string }): Promise<GoogleMeetSpace>;
  listConferenceRecordings(input: {
    conferenceRecordName: string;
    pageToken: string | null;
  }): Promise<{
    nextPageToken: string | null;
    recordings: GoogleMeetRecording[];
  }>;
  listConferenceRecords(input: {
    endTime: Date;
    pageToken: string | null;
    startTime: Date;
  }): Promise<{
    conferenceRecords: GoogleConferenceRecord[];
    nextPageToken: string | null;
  }>;
  listPrimaryCalendarEvents(input: {
    pageToken: string | null;
    timeMax: Date;
    timeMin: Date;
  }): Promise<{
    events: GoogleCalendarEvent[];
    nextPageToken: string | null;
  }>;
};

type SyncGoogleMeetIntegrationInput = {
  client: GoogleMeetSyncClient;
  integration: {
    accessToken: string;
    id: string;
    lastSyncCursor: Date | null;
    orgId: string;
  };
  now?: Date;
  repository: GoogleMeetSyncRepository;
};

const INITIAL_BACKFILL_MS = 7 * 24 * 60 * 60 * 1000;
const RECORDING_READINESS_OVERLAP_MS = 24 * 60 * 60 * 1000;

export async function syncGoogleMeetIntegration(
  input: SyncGoogleMeetIntegrationInput,
) {
  if (!(await input.repository.organizationHasIntegrationCapability(input.integration.orgId))) {
    return { cursor: input.integration.lastSyncCursor ?? new Date(0) };
  }

  const now = input.now ?? new Date();
  const startTime = input.integration.lastSyncCursor
    ? new Date(
        input.integration.lastSyncCursor.getTime() -
          RECORDING_READINESS_OVERLAP_MS,
      )
    : new Date(now.getTime() - INITIAL_BACKFILL_MS);
  const [events, conferences, titleFilters] = await Promise.all([
    listAllCalendarEvents(input.client, startTime, now),
    listAllConferenceRecords(input.client, startTime, now),
    input.repository.getIngestionTitleFilterConfig(input.integration.orgId),
  ]);

  for (const conference of conferences) {
    const space = conference.space
      ? await input.client
          .getMeetingSpace({ spaceResource: conference.space })
          .catch(() => null)
      : null;
    const meetingCode = space?.meetingCode ?? null;
    const recordings = await listAllRecordings(input.client, conference.name);

    for (const recording of recordings) {
      if (!(await input.repository.organizationHasIntegrationCapability(input.integration.orgId))) {
        return { cursor: input.integration.lastSyncCursor ?? new Date(0) };
      }
      await discoverRecording({
        client: input.client,
        conference,
        events,
        integrationId: input.integration.id,
        meetingCode,
        orgId: input.integration.orgId,
        recording,
        repository: input.repository,
        titleFilters,
      });
    }
  }

  return { cursor: now };
}

async function discoverRecording(input: {
  client: GoogleMeetSyncClient;
  conference: GoogleConferenceRecord;
  events: GoogleCalendarEvent[];
  integrationId: string;
  meetingCode: string | null;
  orgId: string;
  recording: GoogleMeetRecording;
  repository: GoogleMeetSyncRepository;
  titleFilters: IngestionTitleFilterConfig;
}) {
  const driveFileId = parseDriveFileId(
    input.recording.driveDestination?.file ?? null,
  );
  let meetingTitle = input.meetingCode
    ? findCalendarEventTitleByMeetingCode(input.meetingCode, input.events)
    : null;
  let titleSource: "calendar" | "drive" | null = meetingTitle
    ? "calendar"
    : null;

  if (!meetingTitle && driveFileId) {
    const metadata = await input.client.getDriveFileMetadata({ fileId: driveFileId });
    meetingTitle = metadata.name;
    titleSource = meetingTitle ? "drive" : null;
  }

  let skippedReason: GoogleMeetDiscoverySkippedReason | null = null;
  if (input.recording.state !== "FILE_GENERATED" || !driveFileId) {
    skippedReason = "recording_not_ready";
  } else {
    skippedReason = decisionToSkippedReason(
      evaluateIngestionTitleFilter(meetingTitle, input.titleFilters).reason,
    );
  }

  await input.repository.upsertGoogleMeetImport({
    conferenceEndedAt: parseOptionalDate(input.conference.endTime),
    conferenceRecordName: input.conference.name,
    conferenceStartedAt: parseOptionalDate(input.conference.startTime),
    driveFileId,
    integrationId: input.integrationId,
    meetingCode: input.meetingCode,
    meetingTitle,
    orgId: input.orgId,
    recordingName: input.recording.name,
    skippedReason,
    status: skippedReason ? "skipped" : "pending",
    titleSource,
  });
}

async function listAllCalendarEvents(
  client: GoogleMeetSyncClient,
  timeMin: Date,
  timeMax: Date,
) {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | null = null;

  do {
    const page = await client.listPrimaryCalendarEvents({
      pageToken,
      timeMax,
      timeMin,
    });
    events.push(...page.events);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return events;
}

async function listAllConferenceRecords(
  client: GoogleMeetSyncClient,
  startTime: Date,
  endTime: Date,
) {
  const conferences: GoogleConferenceRecord[] = [];
  let pageToken: string | null = null;

  do {
    const page = await client.listConferenceRecords({
      endTime,
      pageToken,
      startTime,
    });
    conferences.push(...page.conferenceRecords);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return conferences;
}

async function listAllRecordings(
  client: GoogleMeetSyncClient,
  conferenceRecordName: string,
) {
  const recordings: GoogleMeetRecording[] = [];
  let pageToken: string | null = null;

  do {
    const page = await client.listConferenceRecordings({
      conferenceRecordName,
      pageToken,
    });
    recordings.push(...page.recordings);
    pageToken = page.nextPageToken;
  } while (pageToken);

  return recordings;
}

function parseDriveFileId(resource: string | null) {
  if (!resource) {
    return null;
  }

  const match = /^files\/([^/]+)$/.exec(resource.trim());
  return match?.[1] ?? null;
}

function parseOptionalDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function decisionToSkippedReason(
  reason:
    | "included"
    | "excluded"
    | "unconfigured"
    | "missing_title"
    | "no_include_match",
): GoogleMeetDiscoverySkippedReason | null {
  switch (reason) {
    case "included":
      return null;
    case "excluded":
      return "title_excluded";
    case "unconfigured":
      return "title_filter_unconfigured";
    case "missing_title":
      return "title_missing";
    case "no_include_match":
      return "title_no_include_match";
  }
}
