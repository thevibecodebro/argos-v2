import crypto from "node:crypto";
import { storeZoomCallSource, type SourceAsset } from "@/lib/calls/ingestion-service";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { getActiveRubric, type RubricsRepository } from "@/lib/rubrics/service";
import { refreshZoomToken } from "./oauth";

type ZoomWebhookEnv = Partial<Record<
  "ZOOM_WEBHOOK_SECRET_TOKEN" | "ZOOM_CLIENT_ID" | "ZOOM_CLIENT_SECRET",
  string | undefined
>>;

type CallStatus = "uploaded" | "transcribing" | "evaluating" | "complete" | "failed";
type CallProcessingJobStatus = "pending" | "running" | "retrying" | "failed" | "complete";

export interface ZoomWebhookRepository {
  createCall(input: {
    callTopic: string | null;
    consentConfirmed: boolean;
    durationSeconds: number | null;
    orgId: string;
    rubricId?: string | null;
    recordingUrl: string | null;
    repId: string;
    status: CallStatus;
    zoomMeetingId: string | null;
    zoomRecordingId: string;
  }): Promise<{ id: string }>;
  createOrResetCallProcessingJob(input: {
    callId: string;
    rubricId?: string | null;
    sourceOrigin: "zoom_recording";
    sourceStoragePath: string;
    sourceFileName: string;
    sourceContentType: string | null;
    sourceSizeBytes: number | null;
  }): Promise<void>;
  findCallByZoomRecordingId(
    zoomRecordingId: string,
  ): Promise<{ id: string; status: CallStatus; jobStatus: CallProcessingJobStatus | null } | null>;
  findPreferredCallOwner(orgId: string): Promise<{ id: string } | null>;
  findZoomIntegrationByAccountId(accountId: string): Promise<{
    orgId: string;
    webhookToken: string | null;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  } | null>;
  updateCallRecording(callId: string, recordingUrl: string | null): Promise<void>;
  updateCallStatus(callId: string, status: CallStatus): Promise<void>;
  updateZoomTokens(orgId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }): Promise<void>;
}

type ZoomWebhookRequest = {
  headers: {
    signature: string | null;
    timestamp: string | null;
  };
  rawBody: string;
  env?: ZoomWebhookEnv;
  now?: number;
};

type ZoomWebhookResponse = {
  status: number;
  body: Record<string, unknown>;
};

type ZoomWebhookPayload = {
  event?: string;
  payload?: {
    account_id?: string;
    plainToken?: string;
    object?: {
      id?: string;
      topic?: string;
      duration?: number;
      recording_files?: Array<{
        id?: string;
        recording_type?: string;
        download_url?: string;
        file_extension?: string;
        file_type?: string;
      }>;
    };
  };
};

type ZoomRecordingFile = {
  id?: string;
  recording_type?: string;
  download_url?: string;
  file_extension?: string;
  file_type?: string;
};

type DownloadedRecordingAsset = {
  audioBytes: Buffer;
  contentType: string | null;
  fileName: string;
};

type ZoomWebhookDependencies = {
  rubricsRepository?: RubricsRepository;
  storeSourceAsset?: (input: {
    callId: string;
    bytes: Buffer;
    contentType: string | null;
    fileName: string;
  }) => Promise<SourceAsset>;
};

const COMPLETED_OR_ACTIVE_JOB_STATUSES: ReadonlySet<CallProcessingJobStatus> = new Set([
  "pending",
  "running",
  "retrying",
  "complete",
]);

export async function processZoomWebhookRequest(
  repository: ZoomWebhookRepository,
  input: ZoomWebhookRequest,
  dependencies: ZoomWebhookDependencies = {},
): Promise<ZoomWebhookResponse> {
  const env = input.env ?? process.env;
  const parsed = safeParseJson(input.rawBody);

  if (!parsed) {
    return {
      status: 400,
      body: { error: "Invalid JSON payload" },
    };
  }

  const accountId = parsed.payload?.account_id ?? null;
  const integration = accountId
    ? await repository.findZoomIntegrationByAccountId(accountId)
    : null;
  const secret = integration?.webhookToken ?? env.ZOOM_WEBHOOK_SECRET_TOKEN;

  if (
    !secret ||
    !verifyZoomWebhookSignature({
      rawBody: input.rawBody,
      secret,
      signature: input.headers.signature,
      timestamp: input.headers.timestamp,
      now: input.now,
    })
  ) {
    return {
      status: 401,
      body: { error: "Invalid webhook signature" },
    };
  }

  if (parsed.event === "endpoint.url_validation") {
    const plainToken = parsed.payload?.plainToken;

    if (!plainToken) {
      return {
        status: 400,
        body: { error: "Missing plainToken" },
      };
    }

    return {
      status: 200,
      body: {
        plainToken,
        encryptedToken: crypto.createHmac("sha256", secret).update(plainToken).digest("hex"),
      },
    };
  }

  if (parsed.event !== "recording.completed") {
    return {
      status: 200,
      body: { received: true },
    };
  }

  const recording = pickPreferredRecording(parsed.payload?.object?.recording_files ?? []);

  if (!integration || !recording?.id) {
    return {
      status: 200,
      body: { received: true },
    };
  }

  const existing = await repository.findCallByZoomRecordingId(recording.id);

  if (existing?.jobStatus && COMPLETED_OR_ACTIVE_JOB_STATUSES.has(existing.jobStatus)) {
    return {
      status: 200,
      body: { received: true },
    };
  }

  if (existing && existing.status !== "failed" && existing.jobStatus !== "failed") {
    return {
      status: 200,
      body: { received: true },
    };
  }

  const owner = await repository.findPreferredCallOwner(integration.orgId);

  if (!owner) {
    return {
      status: 200,
      body: { received: true },
    };
  }

  let accessToken = integration.accessToken;
  if (integration.tokenExpiresAt <= new Date()) {
    try {
      const refreshed = await refreshZoomToken(integration.refreshToken, env as Record<string, string | undefined>);
      await repository.updateZoomTokens(integration.orgId, refreshed);
      accessToken = refreshed.accessToken;
    } catch {
      // Continue with the current token if refresh fails; the download may still succeed.
    }
  }

  const durationSeconds = typeof parsed.payload?.object?.duration === "number"
    ? parsed.payload.object.duration * 60
    : null;
  const callTopic = parsed.payload?.object?.topic?.trim() || "Zoom cloud recording";
  const rubricsRepository = dependencies.rubricsRepository ?? createRubricsRepository();
  const activeRubric = await getActiveRubric(rubricsRepository, integration.orgId);
  const rubricId = activeRubric.ok ? activeRubric.data.id : null;
  const createdNewCall = !existing;
  const callId = existing?.id ?? (
    await repository.createCall({
      orgId: integration.orgId,
      repId: owner.id,
      rubricId,
      callTopic,
      durationSeconds,
      recordingUrl: null,
      consentConfirmed: true,
      status: "uploaded",
      zoomRecordingId: recording.id,
      zoomMeetingId: parsed.payload?.object?.id ?? null,
    })
  ).id;

  try {
    if (!createdNewCall && existing?.status === "failed") {
      await repository.updateCallStatus(callId, "uploaded");
    }

    const recordingAsset = await downloadRecording({
      downloadUrl: recording.download_url ?? null,
      accessToken,
      fileExtension: recording.file_extension ?? null,
      recordingId: recording.id,
    });
    const storeSourceAsset = dependencies.storeSourceAsset ?? storeZoomCallSource;
    const sourceAsset = await storeSourceAsset({
      callId,
      bytes: recordingAsset.audioBytes,
      contentType: recordingAsset.contentType,
      fileName: recordingAsset.fileName,
    });

    await repository.updateCallRecording(callId, sourceAsset.publicUrl);
    await repository.createOrResetCallProcessingJob({
      callId,
      rubricId,
      sourceOrigin: "zoom_recording",
      sourceStoragePath: sourceAsset.storagePath,
      sourceFileName: recordingAsset.fileName,
      sourceContentType: recordingAsset.contentType,
      sourceSizeBytes: recordingAsset.audioBytes.length,
    });
  } catch (error) {
    await Promise.resolve(repository.updateCallStatus(callId, "failed")).catch(() => undefined);
    throw error;
  }

  return {
    status: 200,
    body: { received: true },
  };
}

async function downloadRecording(input: {
  downloadUrl: string | null;
  accessToken: string;
  fileExtension: string | null;
  recordingId: string;
}): Promise<DownloadedRecordingAsset> {
  const fallbackExtension = input.fileExtension?.toLowerCase() || "m4a";
  const defaultFileName = `${input.recordingId}.${fallbackExtension}`;

  if (!input.downloadUrl) {
    throw new Error("Zoom recording is missing a download URL");
  }

  const response = await fetch(input.downloadUrl, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Zoom recording download failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "audio/mp4";
  const ext = input.fileExtension?.toLowerCase() || (contentType.includes("mp4") ? "mp4" : "m4a");
  const arrayBuffer = await response.arrayBuffer();

  return {
    audioBytes: Buffer.from(arrayBuffer),
    contentType,
    fileName: `${input.recordingId}.${ext}`,
  };
}

function safeParseJson(value: string): ZoomWebhookPayload | null {
  try {
    return JSON.parse(value) as ZoomWebhookPayload;
  } catch {
    return null;
  }
}

function pickPreferredRecording(
  files: ZoomRecordingFile[],
) {
  return (
    files.find((file) => file.recording_type === "audio_only" && file.file_extension?.toLowerCase() === "m4a" && file.download_url) ??
    files.find((file) => file.file_extension?.toLowerCase() === "m4a" && file.download_url) ??
    files.find((file) => file.file_type?.toLowerCase() === "mp4" && file.download_url) ??
    files.find((file) => file.download_url)
  );
}

function verifyZoomWebhookSignature(input: {
  rawBody: string;
  secret: string;
  signature: string | null;
  timestamp: string | null;
  now?: number;
}) {
  if (!input.signature || !input.timestamp) {
    return false;
  }

  const timestampValue = Number.parseInt(input.timestamp, 10);

  if (Number.isNaN(timestampValue)) {
    return false;
  }

  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);

  if (Math.abs(nowSeconds - timestampValue) > 300) {
    return false;
  }

  const message = `v0:${input.timestamp}:${input.rawBody}`;
  const expected = `v0=${crypto.createHmac("sha256", input.secret).update(message).digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
}
