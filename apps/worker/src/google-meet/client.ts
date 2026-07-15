import {
  downloadDriveFile,
  getDriveFileMetadata,
  getMeetingSpace,
  listConferenceRecordings,
  listConferenceRecords,
  listPrimaryCalendarEvents,
} from "@argos-v2/google-workspace-client";
import type { GoogleMeetImportClient } from "./process-google-meet-import";
import type { GoogleMeetSyncClient } from "./sync-google-meet";

export function createGoogleMeetSyncClient(
  accessToken: string,
): GoogleMeetSyncClient {
  return {
    getDriveFileMetadata: (input) =>
      getDriveFileMetadata({ ...input, accessToken }),
    getMeetingSpace: (input) => getMeetingSpace({ ...input, accessToken }),
    listConferenceRecordings: (input) =>
      listConferenceRecordings({ ...input, accessToken }),
    listConferenceRecords: (input) =>
      listConferenceRecords({ ...input, accessToken }),
    listPrimaryCalendarEvents: (input) =>
      listPrimaryCalendarEvents({ ...input, accessToken }),
  };
}

export function createGoogleMeetImportClient(
  accessToken: string,
): GoogleMeetImportClient {
  return {
    downloadDriveFile: (input) => downloadDriveFile({ ...input, accessToken }),
  };
}
