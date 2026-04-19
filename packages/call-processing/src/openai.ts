import {
  CALL_SCORING_CATEGORIES,
  CALL_SCORE_LABELS_BY_SLUG,
  buildCallScoringSystemPrompt,
  computeWeightedOverallScore,
} from "./rubric";
import {
  CALL_SCORING_CATEGORY_SLUGS,
  CALL_STAGE_REACHED_VALUES,
  type CallScoringCategorySlug,
  CallEvaluation,
  CallEvaluationMoment,
  CallMomentSeverity,
  type CallStageReached,
  TranscriptLine,
} from "./types";

export type CallScoringInput = {
  audioBytes: Buffer;
  callTopic: string | null;
  contentType: string | null;
  fileName: string;
};

export type CallScoringConfig = {
  apiKey?: string;
  baseUrl?: string;
  scoringModel?: string;
  transcriptionModel?: string;
};

type DiarizedSegment = {
  end?: number;
  speaker?: string;
  start?: number;
  text?: string;
};

type TranscriptionResponse = {
  segments?: DiarizedSegment[];
  text?: string;
  usage?: {
    seconds?: number;
    type?: string;
  };
};

type ParsedScoringResponse = {
  callStageReached: CallStageReached;
  categoryScores: Record<CallScoringCategorySlug, number>;
  confidence: "high" | "medium" | "low";
  improvements: string[];
  moments: CallEvaluationMoment[];
  recommendedDrills: string[];
  strengths: string[];
};

type TranscriptGroup =
  | TranscriptLine[]
  | {
      offsetSeconds: number;
      transcript: TranscriptLine[];
    };

export function resolveCallScoringConfig(
  config: CallScoringConfig = {},
): Required<CallScoringConfig> {
  const apiKey = config.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }

  const baseUrl = (
    config.baseUrl?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  return {
    apiKey,
    baseUrl,
    scoringModel:
      config.scoringModel?.trim() ||
      process.env.OPENAI_CALL_SCORING_MODEL?.trim() ||
      "gpt-5-mini",
    transcriptionModel:
      config.transcriptionModel?.trim() ||
      process.env.OPENAI_CALL_TRANSCRIPTION_MODEL?.trim() ||
      "gpt-4o-transcribe-diarize",
  };
}

export function normalizeTranscriptionPayload(payload: TranscriptionResponse) {
  const segments = Array.isArray(payload.segments)
    ? payload.segments.filter(
        (
          segment,
        ): segment is Required<Pick<DiarizedSegment, "text">> & DiarizedSegment =>
          typeof segment?.text === "string" && segment.text.trim().length > 0,
      )
    : [];

  const transcript = (
    segments.length > 0
      ? segments
      : [{ start: 0, speaker: "A", text: payload.text ?? "" }]
  )
    .map((segment) => ({
      timestampSeconds: Math.max(
        0,
        Math.round(typeof segment.start === "number" ? segment.start : 0),
      ),
      speaker: normalizeSpeaker(segment.speaker),
      text: segment.text.trim(),
    }))
    .filter((segment) => segment.text.length > 0);

  if (!transcript.length) {
    throw new Error("OpenAI transcription returned no transcript text");
  }

  const durationFromUsage =
    typeof payload.usage?.seconds === "number"
      ? Math.max(1, Math.round(payload.usage.seconds))
      : null;
  const durationFromSegments = segments.reduce((latest, segment) => {
    const end = typeof segment.end === "number" ? segment.end : 0;
    return Math.max(latest, Math.round(end));
  }, 0);

  return {
    durationSeconds: durationFromUsage ?? durationFromSegments,
    transcript,
  };
}

export function mergeTranscriptLines(transcriptGroups: TranscriptGroup[]) {
  return transcriptGroups
    .flatMap((group) => {
      if (Array.isArray(group)) {
        return group;
      }

      return group.transcript.map((line) => ({
        ...line,
        timestampSeconds: line.timestampSeconds + group.offsetSeconds,
      }));
    })
    .sort((left, right) => left.timestampSeconds - right.timestampSeconds)
    .map((line, index, lines) => ({
      ...line,
      timestampSeconds:
        index > 0 && line.timestampSeconds < lines[index - 1]!.timestampSeconds
          ? lines[index - 1]!.timestampSeconds
          : line.timestampSeconds,
    }));
}

export async function transcribeAudioBuffer(input: {
  audioBytes: Buffer;
  contentType: string | null;
  fileName: string;
  config?: CallScoringConfig;
}) {
  const resolved = resolveCallScoringConfig(input.config);
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(input.audioBytes)], {
      type: input.contentType?.trim() || "application/octet-stream",
    }),
    input.fileName,
  );
  form.append("model", resolved.transcriptionModel);
  form.append(
    "response_format",
    resolved.transcriptionModel.includes("diarize") ? "diarized_json" : "json",
  );
  form.append("chunking_strategy", "auto");

  const response = await fetch(`${resolved.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `OpenAI transcription request failed: ${response.status}${
        errorBody ? ` ${errorBody}` : ""
      }`,
    );
  }

  return normalizeTranscriptionPayload((await response.json()) as TranscriptionResponse);
}

export async function scoreTranscriptFromLines(input: {
  callTopic: string | null;
  durationSeconds: number;
  transcript: TranscriptLine[];
  config?: CallScoringConfig;
}): Promise<CallEvaluation> {
  const resolved = resolveCallScoringConfig(input.config);
  const response = await fetch(`${resolved.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolved.scoringModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildCallScoringSystemPrompt(),
        },
        {
          role: "user",
          content: buildScoringUserPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `OpenAI call scoring request failed: ${response.status}${
        errorBody ? ` ${errorBody}` : ""
      }`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI call scoring returned an empty response");
  }

  const scoring = parseScoringResponse(content, input.durationSeconds);

  return {
    confidence: scoring.confidence,
    durationSeconds: input.durationSeconds,
    callStageReached: scoring.callStageReached,
    overallScore: computeWeightedOverallScore(scoring.categoryScores),
    frameControlScore: scoring.categoryScores.frame_control,
    rapportScore: scoring.categoryScores.rapport,
    discoveryScore: scoring.categoryScores.discovery,
    painExpansionScore: scoring.categoryScores.pain_expansion,
    solutionScore: scoring.categoryScores.solution,
    objectionScore: scoring.categoryScores.objection_handling,
    closingScore: scoring.categoryScores.closing,
    strengths: scoring.strengths,
    improvements: scoring.improvements,
    recommendedDrills: scoring.recommendedDrills,
    transcript: input.transcript,
    moments: scoring.moments,
  };
}

export async function scoreCallRecording(
  input: CallScoringInput,
  config: CallScoringConfig = {},
): Promise<CallEvaluation> {
  const transcription = await transcribeAudioBuffer({
    audioBytes: input.audioBytes,
    contentType: input.contentType,
    fileName: input.fileName,
    config,
  });

  return scoreTranscriptFromLines({
    callTopic: input.callTopic,
    durationSeconds: transcription.durationSeconds,
    transcript: transcription.transcript,
    config,
  });
}

function normalizeSpeaker(value: string | undefined) {
  const speaker = value?.trim();

  if (!speaker) {
    return "Speaker A";
  }

  return speaker.startsWith("Speaker ") ? speaker : `Speaker ${speaker}`;
}

function buildScoringUserPrompt(input: {
  callTopic: string | null;
  durationSeconds: number;
  transcript: TranscriptLine[];
}) {
  return [
    `Call topic: ${input.callTopic?.trim() || "(unspecified)"}`,
    `Duration seconds: ${input.durationSeconds}`,
    "Transcript:",
    input.transcript
      .map(
        (line) =>
          `[${formatTimestamp(line.timestampSeconds)}] ${line.speaker}: ${line.text}`,
      )
      .join("\n"),
  ].join("\n");
}

function formatTimestamp(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function parseScoringResponse(
  content: string,
  durationSeconds: number,
): ParsedScoringResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI call scoring returned invalid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI call scoring returned an invalid payload");
  }

  const record = parsed as Record<string, unknown>;
  const rawScores =
    record.categoryScores && typeof record.categoryScores === "object"
      ? (record.categoryScores as Record<string, unknown>)
      : {};

  const categoryScores = CALL_SCORING_CATEGORIES.reduce(
    (scores, category) => ({
      ...scores,
      [category.slug]: clampScore(rawScores[category.slug]),
    }),
    {} as Record<CallScoringCategorySlug, number>,
  );

  const confidence = normalizeConfidence(record.confidence);
  const callStageReached = normalizeCallStage(record.callStageReached);

  const strengths = normalizeStringArray(record.strengths);
  const improvements = normalizeStringArray(record.improvements);
  const recommendedDrills = normalizeStringArray(record.recommendedDrills);

  return {
    confidence,
    callStageReached,
    categoryScores,
    strengths:
      strengths.length > 0
        ? strengths.slice(0, 3)
        : deriveFallbackNarratives(categoryScores, "strength"),
    improvements:
      improvements.length > 0
        ? improvements.slice(0, 3)
        : deriveFallbackNarratives(categoryScores, "improvement"),
    recommendedDrills:
      recommendedDrills.length > 0
        ? recommendedDrills.slice(0, 3)
        : deriveFallbackDrills(categoryScores),
    moments: normalizeMoments(record.moments, durationSeconds),
  };
}

function normalizeConfidence(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "medium";
}

function clampScore(value: unknown) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (Number.isNaN(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
}

function normalizeMoments(value: unknown, durationSeconds: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const moments: CallEvaluationMoment[] = [];

  for (const rawMoment of value) {
    const moment = normalizeMoment(rawMoment, durationSeconds);

    if (moment) {
      moments.push(moment);
    }
  }

  return moments.slice(0, 5);
}

function normalizeMoment(value: unknown, durationSeconds: number) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const category = normalizeCategory(record.category);
  const observation =
    typeof record.observation === "string" ? record.observation.trim() : "";
  const recommendation =
    typeof record.recommendation === "string" ? record.recommendation.trim() : "";

  if (!category || !observation || !recommendation) {
    return null;
  }

  const timestamp =
    typeof record.timestampSeconds === "number"
      ? record.timestampSeconds
      : typeof record.timestampSeconds === "string"
        ? Number.parseFloat(record.timestampSeconds)
        : Number.NaN;
  const severity = normalizeSeverity(record.severity);
  const isHighlight =
    typeof record.isHighlight === "boolean"
      ? record.isHighlight
      : severity === "strength";

  return {
    timestampSeconds: Number.isNaN(timestamp)
      ? 0
      : Math.max(0, Math.min(durationSeconds, Math.round(timestamp))),
    category,
    observation,
    recommendation,
    severity,
    isHighlight,
    highlightNote:
      typeof record.highlightNote === "string" && record.highlightNote.trim()
        ? record.highlightNote.trim()
        : null,
  };
}

function normalizeCategory(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return CALL_SCORING_CATEGORY_SLUGS.includes(
    normalized as CallScoringCategorySlug,
  )
    ? (normalized as CallScoringCategorySlug)
    : null;
}

function normalizeCallStage(value: unknown): CallStageReached {
  if (typeof value !== "string") {
    return "discovery";
  }

  const normalized = value.trim().toLowerCase();
  return CALL_STAGE_REACHED_VALUES.includes(normalized as CallStageReached)
    ? (normalized as CallStageReached)
    : "discovery";
}

function normalizeSeverity(value: unknown): CallMomentSeverity {
  return value === "strength" || value === "critical" ? value : "improvement";
}

function deriveFallbackNarratives(
  scores: Record<CallScoringCategorySlug, number>,
  mode: "improvement" | "strength",
) {
  const sorted = [...CALL_SCORING_CATEGORIES].sort((left, right) =>
    mode === "strength"
      ? scores[right.slug] - scores[left.slug]
      : scores[left.slug] - scores[right.slug],
  );

  return sorted.slice(0, 2).map((category) =>
    mode === "strength"
      ? `${CALL_SCORE_LABELS_BY_SLUG[category.slug]} was one of the strongest parts of the call.`
      : `${CALL_SCORE_LABELS_BY_SLUG[category.slug]} needs tighter execution and more repetition.`,
  );
}

function deriveFallbackDrills(scores: Record<CallScoringCategorySlug, number>) {
  return [...CALL_SCORING_CATEGORIES]
    .sort((left, right) => scores[left.slug] - scores[right.slug])
    .slice(0, 2)
    .map((category) => `${CALL_SCORE_LABELS_BY_SLUG[category.slug]} drill`);
}
