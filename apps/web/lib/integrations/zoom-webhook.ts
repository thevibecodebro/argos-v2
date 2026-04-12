import crypto from "node:crypto";
import { refreshZoomToken } from "./oauth";

type ZoomWebhookEnv = Partial<Record<
  "ZOOM_WEBHOOK_SECRET_TOKEN" | "AI_INTEGRATIONS_OPENAI_BASE_URL" | "AI_INTEGRATIONS_OPENAI_API_KEY" | "ZOOM_CLIENT_ID" | "ZOOM_CLIENT_SECRET",
  string | undefined
>>;

type ZoomEvaluation = {
  confidence: string;
  durationSeconds: number;
  callStageReached: string;
  overallScore: number;
  frameControlScore: number;
  rapportScore: number;
  discoveryScore: number;
  painExpansionScore: number;
  solutionScore: number;
  objectionScore: number;
  closingScore: number;
  strengths: string[];
  improvements: string[];
  recommendedDrills: string[];
  transcript: Array<{
    timestampSeconds: number;
    speaker: string;
    text: string;
  }>;
  moments: Array<{
    timestampSeconds: number;
    category: string;
    observation: string;
    recommendation: string;
    severity: "strength" | "improvement" | "critical";
    isHighlight: boolean;
    highlightNote: string | null;
  }>;
};

export interface ZoomWebhookRepository {
  createCall(input: {
    callTopic: string | null;
    consentConfirmed: boolean;
    durationSeconds: number | null;
    orgId: string;
    recordingUrl: string | null;
    repId: string;
    status: "uploaded" | "transcribing" | "evaluating" | "complete" | "failed";
    zoomMeetingId: string | null;
    zoomRecordingId: string;
  }): Promise<{ id: string }>;
  findCallByZoomRecordingId(zoomRecordingId: string): Promise<{ id: string } | null>;
  findPreferredCallOwner(orgId: string): Promise<{ id: string } | null>;
  findZoomIntegrationByAccountId(accountId: string): Promise<{ orgId: string; webhookToken: string | null; accessToken: string; refreshToken: string; tokenExpiresAt: Date } | null>;
  updateZoomTokens(orgId: string, tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }): Promise<void>;
  setCallEvaluation(callId: string, evaluation: ZoomEvaluation): Promise<void>;
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

export async function processZoomWebhookRequest(
  repository: ZoomWebhookRepository,
  input: ZoomWebhookRequest,
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

  if (existing) {
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

  // Refresh access token if expired
  let accessToken = integration.accessToken;
  if (integration.tokenExpiresAt <= new Date()) {
    try {
      const refreshed = await refreshZoomToken(integration.refreshToken, env as Record<string, string | undefined>);
      await repository.updateZoomTokens(integration.orgId, refreshed);
      accessToken = refreshed.accessToken;
    } catch {
      // Continue with existing token — it may still work
    }
  }

  const durationSeconds = parsed.payload?.object?.duration
    ? parsed.payload.object.duration * 60
    : null;
  const callTopic = parsed.payload?.object?.topic?.trim() || "Zoom cloud recording";

  // Download and store recording
  const recordingUrl = await downloadAndStoreRecording({
    downloadUrl: recording.download_url ?? null,
    accessToken,
    recordingId: recording.id,
  });

  const call = await repository.createCall({
    orgId: integration.orgId,
    repId: owner.id,
    callTopic,
    durationSeconds,
    recordingUrl,
    consentConfirmed: true,
    status: "evaluating",
    zoomRecordingId: recording.id,
    zoomMeetingId: parsed.payload?.object?.id ?? null,
  });

  const evaluation = buildMockEvaluation({
    callTopic,
    durationSeconds: durationSeconds ?? 0,
    recordingId: recording.id,
  });

  await repository.setCallEvaluation(call.id, evaluation);

  return {
    status: 200,
    body: { received: true },
  };
}

async function downloadAndStoreRecording(input: {
  downloadUrl: string | null;
  accessToken: string;
  recordingId: string;
}): Promise<string | null> {
  if (!input.downloadUrl) {
    return null;
  }

  try {
    const response = await fetch(input.downloadUrl, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });

    if (!response.ok || !response.body) {
      return input.downloadUrl;
    }

    const contentType = response.headers.get("content-type") ?? "audio/mp4";
    const ext = contentType.includes("mp4") ? "mp4" : "m4a";
    const fileName = `recordings/${input.recordingId}.${ext}`;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.storage
      .from("call-recordings")
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      return input.downloadUrl;
    }

    const { data } = supabase.storage.from("call-recordings").getPublicUrl(fileName);
    return data.publicUrl;
  } catch {
    return input.downloadUrl;
  }
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
    files.find((file) => file.recording_type === "audio_only" && file.file_extension?.toLowerCase() === "m4a") ??
    files.find((file) => file.file_extension?.toLowerCase() === "m4a") ??
    files.find((file) => file.file_type?.toLowerCase() === "mp4") ??
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

function buildMockEvaluation(input: {
  callTopic: string;
  durationSeconds: number;
  recordingId: string;
}): ZoomEvaluation {
  const seed = hashString(`${input.callTopic}:${input.recordingId}:${input.durationSeconds}`);
  const base = 64 + (seed % 15);

  const frameControlScore = clampScore(base + offset(seed, 0));
  const rapportScore = clampScore(base + offset(seed, 1));
  const discoveryScore = clampScore(base + offset(seed, 2));
  const painExpansionScore = clampScore(base + offset(seed, 3));
  const solutionScore = clampScore(base + offset(seed, 4));
  const objectionScore = clampScore(base + offset(seed, 5));
  const closingScore = clampScore(base + offset(seed, 6));
  const overallScore = Math.round(
    [
      frameControlScore,
      rapportScore,
      discoveryScore,
      painExpansionScore,
      solutionScore,
      objectionScore,
      closingScore,
    ].reduce((sum, value) => sum + value, 0) / 7,
  );

  const confidence = overallScore >= 85 ? "high" : overallScore >= 72 ? "medium" : "low";

  return {
    confidence,
    durationSeconds: input.durationSeconds || 480,
    callStageReached: overallScore >= 82 ? "proposal" : "discovery",
    overallScore,
    frameControlScore,
    rapportScore,
    discoveryScore,
    painExpansionScore,
    solutionScore,
    objectionScore,
    closingScore,
    strengths: [
      "The rep tied the conversation back to the buyer's operational pain.",
      "The close stayed concise and outcome-oriented.",
    ],
    improvements: [
      "Sharpen the ROI explanation with more quantified proof.",
      "Add one more discovery layer before shifting to solution positioning.",
    ],
    recommendedDrills: ["Discovery drill", "Objection handling drill"],
    transcript: [
      {
        timestampSeconds: 18,
        speaker: "Rep",
        text: `Thanks for joining. I wanted to review ${input.callTopic.toLowerCase()} and understand what is slowing your team down.`,
      },
      {
        timestampSeconds: 72,
        speaker: "Prospect",
        text: "The challenge is consistency. Some reps improve, but coaching takes too long and the same mistakes come back.",
      },
      {
        timestampSeconds: 144,
        speaker: "Rep",
        text: "If we could surface those coaching moments automatically and tie them to a drill, would that change how fast managers can intervene?",
      },
    ],
    moments: [
      {
        timestampSeconds: 72,
        category: "discovery",
        observation: "The rep uncovered a repeatable coaching pain point quickly.",
        recommendation: "Follow the pain thread one level deeper before introducing the platform.",
        severity: discoveryScore >= 80 ? "strength" : "improvement",
        isHighlight: discoveryScore >= 80,
        highlightNote: discoveryScore >= 80 ? "Strong discovery moment" : null,
      },
      {
        timestampSeconds: 144,
        category: "solution",
        observation: "The rep linked the product to coaching speed and consistency.",
        recommendation: "Pair the solution language with a tighter ROI proof point.",
        severity: "strength",
        isHighlight: true,
        highlightNote: "Clear value connection",
      },
    ],
  };
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function offset(seed: number, index: number) {
  return ((seed >> (index * 3)) % 15) - 7;
}

function clampScore(value: number) {
  return Math.max(44, Math.min(96, value));
}
