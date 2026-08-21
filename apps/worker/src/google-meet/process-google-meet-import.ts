import {
  evaluateIngestionTitleFilter,
  isSafeStorageFileName,
  type IngestionTitleFilterConfig,
} from "@argos-v2/call-processing";
import type { GoogleTokenSet } from "@argos-v2/google-workspace-client";
import { decisionToSkippedReason } from "./sync-google-meet";

export type GoogleMeetImportSkippedReason =
  | "no_connected_integration"
  | "sync_disabled"
  | "consent_missing"
  | "billing_inactive"
  | "no_owner"
  | "title_filter_unconfigured"
  | "title_missing"
  | "title_excluded"
  | "title_no_include_match"
  | "recording_not_ready"
  | "unauthorized_after_refresh"
  | "capability_disabled";

export type GoogleMeetImportRecord = {
  attemptCount: number;
  callId: string | null;
  driveFileId: string | null;
  id: string;
  integrationId: string;
  maxAttempts: number;
  meetingTitle: string | null;
  orgId: string;
  recordingName: string;
};

export type GoogleMeetImportRepository = {
  organizationHasIntegrationCapability(orgId: string): Promise<boolean>;
  createCallForGoogleMeetImport(input: {
    consentConfirmed: boolean;
    importId: string;
    meetingTitle: string;
    orgId: string;
    repId: string;
    rubricId: string | null;
  }): Promise<{ id: string }>;
  createOrResetCallProcessingJob(input: {
    callId: string;
    rubricId: string | null;
    sourceContentType: string | null;
    sourceFileName: string;
    sourceOrigin: "google_meet_recording";
    sourceSizeBytes: number;
    sourceStoragePath: string;
  }): Promise<void>;
  findActiveCallProcessingSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }): Promise<{ id: string } | null>;
  findGoogleMeetIntegrationForImport(input: {
    integrationId: string;
    orgId: string;
  }): Promise<{
    consentConfirmedAt: Date | null;
    defaultRepId: string | null;
    id: string;
    orgId: string;
    syncEnabled: boolean;
  } | null>;
  getIngestionTitleFilterConfig(orgId: string): Promise<IngestionTitleFilterConfig>;
  markGoogleMeetImportImported(
    importId: string,
    input: { callId: string },
  ): Promise<void>;
  markGoogleMeetImportSkipped(
    importId: string,
    input: { reason: GoogleMeetImportSkippedReason },
  ): Promise<void>;
  updateCallRecordingStorage(
    callId: string,
    recording: {
      contentType: string | null;
      fileSizeBytes: number;
      storageBucket: string;
      storagePath: string;
    },
  ): Promise<void>;
  updateGoogleMeetTokens?(orgId: string, tokens: GoogleTokenSet): Promise<void>;
};

export type GoogleMeetImportClient = {
  downloadDriveFile(input: {
    fileId: string;
    maxBytes: number;
  }): Promise<{ bytes: Buffer; contentType: string }>;
};

type ProcessGoogleMeetImportInput = {
  client: GoogleMeetImportClient;
  getActiveRubricId: (orgId: string) => Promise<string | null>;
  importRecord: GoogleMeetImportRecord;
  maxSourceBytes: number;
  repository: GoogleMeetImportRepository;
  storeSourceAsset: (input: {
    bytes: Buffer;
    callId: string;
    contentType: string | null;
    fileName: string;
  }) => Promise<{
    contentType: string | null;
    fileSizeBytes: number;
    storageBucket: "call-recordings";
    storagePath: string;
  }>;
};

export async function processGoogleMeetImport(
  input: ProcessGoogleMeetImportInput,
) {
  const record = input.importRecord;
  if (!(await input.repository.organizationHasIntegrationCapability(record.orgId))) {
    return skip(input.repository, record.id, "capability_disabled");
  }

  const integration =
    await input.repository.findGoogleMeetIntegrationForImport({
      integrationId: record.integrationId,
      orgId: record.orgId,
    });

  if (
    !integration ||
    integration.id !== record.integrationId ||
    integration.orgId !== record.orgId
  ) {
    return skip(input.repository, record.id, "no_connected_integration");
  }
  if (!integration.syncEnabled) {
    return skip(input.repository, record.id, "sync_disabled");
  }
  if (!integration.consentConfirmedAt) {
    return skip(input.repository, record.id, "consent_missing");
  }
  if (!integration.defaultRepId) {
    return skip(input.repository, record.id, "no_owner");
  }

  const titleFilters =
    await input.repository.getIngestionTitleFilterConfig(record.orgId);
  const titleDecision = evaluateIngestionTitleFilter(
    record.meetingTitle,
    titleFilters,
  );
  const titleSkippedReason = decisionToSkippedReason(titleDecision.reason);
  if (titleSkippedReason) {
    return skip(input.repository, record.id, titleSkippedReason);
  }

  if (!record.driveFileId) {
    return skip(input.repository, record.id, "recording_not_ready");
  }

  const entitlement =
    await input.repository.findActiveCallProcessingSubscription({
      orgId: record.orgId,
      userId: null,
    });
  if (!entitlement) {
    return skip(input.repository, record.id, "billing_inactive");
  }

  const recording = await input.client.downloadDriveFile({
    fileId: record.driveFileId,
    maxBytes: input.maxSourceBytes,
  });
  if (!(await input.repository.organizationHasIntegrationCapability(record.orgId))) {
    return skip(input.repository, record.id, "capability_disabled");
  }
  const fileName = buildRecordingFileName(record.recordingName);
  const rubricId = await input.getActiveRubricId(record.orgId);
  const call = await input.repository.createCallForGoogleMeetImport({
    consentConfirmed: true,
    importId: record.id,
    meetingTitle: record.meetingTitle as string,
    orgId: record.orgId,
    repId: integration.defaultRepId,
    rubricId,
  });
  if (!(await input.repository.organizationHasIntegrationCapability(record.orgId))) {
    return skip(input.repository, record.id, "capability_disabled");
  }
  const sourceAsset = await input.storeSourceAsset({
    bytes: recording.bytes,
    callId: call.id,
    contentType: recording.contentType,
    fileName,
  });

  await input.repository.updateCallRecordingStorage(call.id, {
    contentType: sourceAsset.contentType,
    fileSizeBytes: sourceAsset.fileSizeBytes,
    storageBucket: sourceAsset.storageBucket,
    storagePath: sourceAsset.storagePath,
  });
  if (!(await input.repository.organizationHasIntegrationCapability(record.orgId))) {
    return skip(input.repository, record.id, "capability_disabled");
  }
  await input.repository.createOrResetCallProcessingJob({
    callId: call.id,
    rubricId,
    sourceContentType: sourceAsset.contentType,
    sourceFileName: fileName,
    sourceOrigin: "google_meet_recording",
    sourceSizeBytes: sourceAsset.fileSizeBytes,
    sourceStoragePath: sourceAsset.storagePath,
  });
  await input.repository.markGoogleMeetImportImported(record.id, {
    callId: call.id,
  });
}

function skip(
  repository: GoogleMeetImportRepository,
  importId: string,
  reason: GoogleMeetImportSkippedReason,
) {
  return repository.markGoogleMeetImportSkipped(importId, { reason });
}

function buildRecordingFileName(recordingName: string) {
  const rawSegment = recordingName.split("/").at(-1) ?? "recording";
  const safeSegment = rawSegment
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "recording";
  const fileName = `google-meet-${safeSegment}.mp4`;

  if (!isSafeStorageFileName(fileName)) {
    throw new Error("Unable to derive a safe Google Meet recording filename");
  }
  return fileName;
}
