import { isSafeStorageFileName } from "@argos-v2/call-processing";
import type { LeadConnectorMessage, LeadConnectorRecording } from "../../../../packages/ghl-client/src/index";

export type GhlCallImportStatus = "pending" | "running" | "retrying" | "imported" | "skipped" | "failed";

export type GhlSkippedReason =
  | "billing_inactive"
  | "no_connected_integration"
  | "consent_missing"
  | "no_recording"
  | "no_owner_mapping"
  | "wrong_message_type"
  | "invalid_recording_filename"
  | "unauthorized_after_refresh";

export type GhlCallImportRecord = {
  id: string;
  orgId: string;
  locationId: string;
  messageId: string;
  conversationId: string | null;
  contactId: string | null;
  ghlUserId: string | null;
  callId: string | null;
  status: GhlCallImportStatus;
  attemptCount: number;
  maxAttempts: number;
};

export type GhlCallImportRepository = {
  createCallForGhlImport(input: {
    importId: string;
    orgId: string;
    repId: string;
    rubricId: string | null;
    callTopic: string | null;
    consentConfirmed: boolean;
    messageId: string;
    conversationId: string | null;
    contactId: string | null;
    ghlUserId: string | null;
    messageCreatedAt: Date | null;
  }): Promise<{ id: string }>;
  createOrResetCallProcessingJob(input: {
    callId: string;
    rubricId?: string | null;
    sourceOrigin: "ghl_recording";
    sourceStoragePath: string;
    sourceFileName: string;
    sourceContentType: string | null;
    sourceSizeBytes: number | null;
  }): Promise<void>;
  findActiveCallProcessingSubscription(input: {
    orgId: string | null;
    userId: string | null;
  }): Promise<{ id: string } | null>;
  findArgosUserIdForGhlUser(input: {
    orgId: string;
    locationId: string;
    ghlUserId: string | null;
  }): Promise<string | null>;
  findGhlIntegrationForImport(input: {
    orgId: string;
    locationId: string;
  }): Promise<{
    orgId: string;
    locationId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    syncEnabled: boolean;
    consentConfirmedAt: Date | null;
    defaultRepId: string | null;
  } | null>;
  markGhlCallImportFailed(importId: string, input: { error: string }): Promise<void>;
  markGhlCallImportImported(importId: string, input: { callId: string }): Promise<void>;
  markGhlCallImportSkipped(importId: string, input: { reason: GhlSkippedReason }): Promise<void>;
  updateCallRecordingStorage(callId: string, recording: {
    storageBucket: string;
    storagePath: string;
    contentType: string | null;
    fileSizeBytes: number | null;
  }): Promise<void>;
  updateGhlTokens(orgId: string, tokens: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  }): Promise<void>;
};

export type GhlLeadConnectorClient = {
  getMessage(messageId: string): Promise<LeadConnectorMessage>;
  downloadMessageRecording(input: {
    locationId: string;
    messageId: string;
  }): Promise<LeadConnectorRecording>;
};

type SourceAsset = {
  storageBucket: "call-recordings";
  storagePath: string;
  contentType: string | null;
  fileSizeBytes: number;
};

type ProcessGhlCallImportInput = {
  importRecord: GhlCallImportRecord;
  repository: GhlCallImportRepository;
  leadConnector: GhlLeadConnectorClient;
  storeSourceAsset: (input: {
    callId: string;
    bytes: Buffer;
    contentType: string | null;
    fileName: string;
  }) => Promise<SourceAsset>;
  getActiveRubricId: (orgId: string) => Promise<string | null>;
};

const CALL_MESSAGE_TYPES = new Set(["CALL", "call", "TYPE_CALL"]);

export async function processGhlCallImport(input: ProcessGhlCallImportInput) {
  const importRecord = input.importRecord;
  const integration = await input.repository.findGhlIntegrationForImport({
    orgId: importRecord.orgId,
    locationId: importRecord.locationId,
  });

  if (
    !integration ||
    integration.orgId !== importRecord.orgId ||
    integration.locationId !== importRecord.locationId
  ) {
    await input.repository.markGhlCallImportSkipped(importRecord.id, {
      reason: "no_connected_integration",
    });
    return;
  }

  if (!integration.syncEnabled || !integration.consentConfirmedAt) {
    await input.repository.markGhlCallImportSkipped(importRecord.id, {
      reason: "consent_missing",
    });
    return;
  }

  const entitlement = await input.repository.findActiveCallProcessingSubscription({
    orgId: integration.orgId,
    userId: null,
  });

  if (!entitlement) {
    await input.repository.markGhlCallImportSkipped(importRecord.id, {
      reason: "billing_inactive",
    });
    return;
  }

  const message = await input.leadConnector.getMessage(importRecord.messageId);

  if (message.type && !CALL_MESSAGE_TYPES.has(message.type)) {
    await input.repository.markGhlCallImportSkipped(importRecord.id, {
      reason: "wrong_message_type",
    });
    return;
  }

  const repId =
    (await input.repository.findArgosUserIdForGhlUser({
      orgId: integration.orgId,
      locationId: integration.locationId,
      ghlUserId: message.userId ?? importRecord.ghlUserId,
    })) ?? integration.defaultRepId;

  if (!repId) {
    await input.repository.markGhlCallImportSkipped(importRecord.id, {
      reason: "no_owner_mapping",
    });
    return;
  }

  let recording: LeadConnectorRecording;

  try {
    recording = await input.leadConnector.downloadMessageRecording({
      locationId: integration.locationId,
      messageId: importRecord.messageId,
    });
  } catch (error) {
    if (isNoRecordingError(error)) {
      await input.repository.markGhlCallImportSkipped(importRecord.id, {
        reason: "no_recording",
      });
      return;
    }

    throw error;
  }

  if (!isSafeStorageFileName(recording.fileName)) {
    await input.repository.markGhlCallImportSkipped(importRecord.id, {
      reason: "invalid_recording_filename",
    });
    return;
  }

  const rubricId = await input.getActiveRubricId(integration.orgId);
  const call = await input.repository.createCallForGhlImport({
    importId: importRecord.id,
    orgId: integration.orgId,
    repId,
    rubricId,
    callTopic: buildCallTopic(message),
    consentConfirmed: true,
    messageId: importRecord.messageId,
    conversationId: message.conversationId ?? importRecord.conversationId,
    contactId: message.contactId ?? importRecord.contactId,
    ghlUserId: message.userId ?? importRecord.ghlUserId,
    messageCreatedAt: parseOptionalDate(message.dateAdded),
  });
  const sourceAsset = await input.storeSourceAsset({
    callId: call.id,
    bytes: recording.bytes,
    contentType: recording.contentType,
    fileName: recording.fileName,
  });

  await input.repository.updateCallRecordingStorage(call.id, {
    storageBucket: sourceAsset.storageBucket,
    storagePath: sourceAsset.storagePath,
    contentType: sourceAsset.contentType,
    fileSizeBytes: sourceAsset.fileSizeBytes,
  });
  await input.repository.createOrResetCallProcessingJob({
    callId: call.id,
    rubricId,
    sourceOrigin: "ghl_recording",
    sourceStoragePath: sourceAsset.storagePath,
    sourceFileName: recording.fileName,
    sourceContentType: sourceAsset.contentType,
    sourceSizeBytes: sourceAsset.fileSizeBytes,
  });
  await input.repository.markGhlCallImportImported(importRecord.id, {
    callId: call.id,
  });
}

function buildCallTopic(message: LeadConnectorMessage) {
  const direction = message.direction?.trim().toLowerCase();

  if (direction === "inbound" || direction === "outbound") {
    return `GHL ${direction} call`;
  }

  return "GHL call";
}

function parseOptionalDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isNoRecordingError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      ((error as { status?: unknown }).status === 400 ||
        (error as { status?: unknown }).status === 404),
  );
}
