import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type { AppUserRole } from "@/lib/users/roles";

export type CallSummary = {
  id: string;
  status: string;
  overallScore: number | null;
  durationSeconds: number | null;
  callTopic: string | null;
  repId: string;
  createdAt: string;
  repFirstName: string | null;
  repLastName: string | null;
};

export type CallMoment = {
  id: string;
  callId: string;
  timestampSeconds: number | null;
  category: string | null;
  observation: string | null;
  recommendation: string | null;
  severity: "strength" | "improvement" | "critical" | null;
  isHighlight: boolean;
  highlightNote: string | null;
  createdAt: string;
};

export type CallAnnotation = {
  id: string;
  callId: string;
  authorId: string;
  timestampSeconds: number | null;
  note: string;
  createdAt: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorRole: string | null;
};

export type TranscriptLine = {
  timestampSeconds: number;
  speaker: string;
  text: string;
};

export type CallDetail = CallSummary & {
  recordingUrl: string | null;
  transcriptUrl: string | null;
  frameControlScore: number | null;
  rapportScore: number | null;
  discoveryScore: number | null;
  painExpansionScore: number | null;
  solutionScore: number | null;
  objectionScore: number | null;
  closingScore: number | null;
  confidence: string | null;
  callStageReached: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  recommendedDrills: string[] | null;
  transcript: TranscriptLine[] | null;
  moments: CallMoment[];
};

export type CallHighlight = {
  id: string;
  callId: string;
  timestampSeconds: number | null;
  category: string | null;
  observation: string | null;
  recommendation: string | null;
  severity: string | null;
  highlightNote: string | null;
  createdAt: string;
  callTopic: string | null;
  callCreatedAt: string;
  repId: string | null;
  repFirstName: string | null;
  repLastName: string | null;
};

export type ScoreTrendPoint = {
  callId: string;
  callTopic: string | null;
  date: string;
  overallScore: number | null;
  frameControl: number | null;
  rapport: number | null;
  discovery: number | null;
  painExpansion: number | null;
  solution: number | null;
  objection: number | null;
  closing: number | null;
};

type CallSummaryRecord = Omit<CallSummary, "createdAt"> & { createdAt: Date };
type CallMomentRecord = Omit<CallMoment, "createdAt"> & { createdAt: Date };
type CallAnnotationRecord = Omit<CallAnnotation, "createdAt"> & { createdAt: Date };
type CallDetailRecord = Omit<
  CallDetail,
  "createdAt" | "moments"
> & { createdAt: Date; orgId: string; moments: CallMomentRecord[] };
type CallHighlightRecord = Omit<CallHighlight, "createdAt" | "callCreatedAt"> & {
  createdAt: Date;
  callCreatedAt: Date;
};
type ScoreTrendRecord = Omit<ScoreTrendPoint, "date"> & { createdAt: Date };

export type CallsFilters = {
  days?: number;
  limit?: number;
  maxScore?: number;
  minScore?: number;
  offset?: number;
  repId?: string;
  search?: string;
  sortBy?: "createdAt" | "overallScore";
  sortOrder?: "asc" | "desc";
  status?: string;
};

type UploadCallInput = {
  callTopic?: string | null;
  fileName: string;
  fileSizeBytes: number;
};

type MockCallEvaluation = {
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
  transcript: TranscriptLine[];
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

type UploadCallResult = {
  id: string;
  status: string;
  createdAt: string;
};

type ServiceErrorCode = "forbidden" | "not_found" | "unprovisioned";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404; error: string; code: ServiceErrorCode };

export type CallsRepository = {
  createCall(input: {
    orgId: string;
    repId: string;
    callTopic: string | null;
    durationSeconds: number | null;
    recordingUrl: string | null;
    transcriptUrl: string | null;
    consentConfirmed: boolean;
    status: "uploaded" | "transcribing" | "evaluating" | "complete" | "failed";
  }): Promise<{ id: string; status: string; createdAt: Date }>;
  createNotification(input: {
    body: string;
    link: string | null;
    title: string;
    type: "call_scored" | "annotation_added" | "module_assigned";
    userId: string;
  }): Promise<void>;
  deleteAnnotation(annotationId: string, callId: string): Promise<boolean>;
  findAnnotations(callId: string): Promise<CallAnnotationRecord[]>;
  findCallById(callId: string): Promise<CallDetailRecord | null>;
  findCallsByOrgId(
    orgId: string,
    filters: CallsFilters,
  ): Promise<{ calls: CallSummaryRecord[]; total: number }>;
  findCallsByRepId(
    repId: string,
    filters: CallsFilters,
  ): Promise<{ calls: CallSummaryRecord[]; total: number }>;
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findHighlightsByOrgId(orgId: string): Promise<CallHighlightRecord[]>;
  findHighlightsByRepId(repId: string): Promise<CallHighlightRecord[]>;
  findScoreTrend(repId: string, since: Date): Promise<ScoreTrendRecord[]>;
  insertAnnotation(input: {
    authorId: string;
    callId: string;
    note: string;
    timestampSeconds: number | null;
  }): Promise<CallAnnotationRecord>;
  setCallEvaluation(callId: string, evaluation: MockCallEvaluation): Promise<void>;
  updateCallTopic(callId: string, callTopic: string | null): Promise<{ id: string; callTopic: string | null }>;
  updateMomentHighlight(
    callId: string,
    momentId: string,
    isHighlight: boolean,
    highlightNote: string | null,
  ): Promise<CallMomentRecord | null>;
};

function isManagerRole(role: AppUserRole | null) {
  return role === "admin" || role === "manager" || role === "executive";
}

function buildViewerName(user: DashboardUserRecord) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

function serializeCallSummary(call: CallSummaryRecord): CallSummary {
  return {
    ...call,
    createdAt: call.createdAt.toISOString(),
  };
}

function serializeMoment(moment: CallMomentRecord): CallMoment {
  return {
    ...moment,
    createdAt: moment.createdAt.toISOString(),
  };
}

function serializeAnnotation(annotation: CallAnnotationRecord): CallAnnotation {
  return {
    ...annotation,
    createdAt: annotation.createdAt.toISOString(),
  };
}

function serializeHighlight(highlight: CallHighlightRecord): CallHighlight {
  return {
    ...highlight,
    createdAt: highlight.createdAt.toISOString(),
    callCreatedAt: highlight.callCreatedAt.toISOString(),
  };
}

function serializeDetail(call: CallDetailRecord): CallDetail {
  return {
    ...call,
    createdAt: call.createdAt.toISOString(),
    transcript: Array.isArray(call.transcript) ? call.transcript : null,
    moments: call.moments.map(serializeMoment),
  };
}

function serializeTrendPoint(point: ScoreTrendRecord): ScoreTrendPoint {
  return {
    callId: point.callId,
    callTopic: point.callTopic,
    date: point.createdAt.toISOString().slice(0, 10),
    overallScore: point.overallScore,
    frameControl: point.frameControl,
    rapport: point.rapport,
    discovery: point.discovery,
    painExpansion: point.painExpansion,
    solution: point.solution,
    objection: point.objection,
    closing: point.closing,
  };
}

async function getViewer(
  repository: CallsRepository,
  authUserId: string,
): Promise<ServiceResult<DashboardUserRecord>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      code: "unprovisioned",
      error: "User is not provisioned in the app database",
    };
  }

  return { ok: true, data: viewer };
}

export async function listCalls(
  repository: CallsRepository,
  authUserId: string,
  filters: CallsFilters = {},
): Promise<
  ServiceResult<{
    calls: CallSummary[];
    total: number;
    viewer: { fullName: string; role: AppUserRole | null };
  }>
> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  if (!viewer.org) {
    return {
      ok: true,
      data: {
        calls: [],
        total: 0,
        viewer: { fullName: buildViewerName(viewer), role: viewer.role },
      },
    };
  }

  if (filters.repId && filters.repId !== viewer.id && !isManagerRole(viewer.role)) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Only managers can view other reps' calls",
    };
  }

  const effectiveRepId =
    viewer.role === "rep" ? viewer.id : filters.repId;

  const result = effectiveRepId
    ? await repository.findCallsByRepId(effectiveRepId, filters)
    : await repository.findCallsByOrgId(viewer.org.id, filters);

  return {
    ok: true,
    data: {
      calls: result.calls.map(serializeCallSummary),
      total: result.total,
      viewer: { fullName: buildViewerName(viewer), role: viewer.role },
    },
  };
}

export async function getCallDetail(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
): Promise<ServiceResult<CallDetail>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;
  const call = await repository.findCallById(callId);

  if (!call || !viewer.org || call.orgId !== viewer.org.id) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      error: "Call not found",
    };
  }

  if (!isManagerRole(viewer.role) && call.repId !== viewer.id) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You can only view your own calls",
    };
  }

  return {
    ok: true,
    data: serializeDetail(call),
  };
}

export async function getCallStatus(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
): Promise<ServiceResult<{ id: string; status: string; overallScore: number | null }>> {
  const detail = await getCallDetail(repository, authUserId, callId);

  if (!detail.ok) {
    return detail;
  }

  return {
    ok: true,
    data: {
      id: detail.data.id,
      status: detail.data.status,
      overallScore: detail.data.overallScore,
    },
  };
}

export async function listAnnotations(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
): Promise<ServiceResult<{ annotations: CallAnnotation[] }>> {
  const detail = await getCallDetail(repository, authUserId, callId);

  if (!detail.ok) {
    return detail;
  }

  const annotations = await repository.findAnnotations(callId);

  return {
    ok: true,
    data: { annotations: annotations.map(serializeAnnotation) },
  };
}

export async function createAnnotation(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
  input: { note: string; timestampSeconds?: number | null },
): Promise<ServiceResult<CallAnnotation>> {
  const detail = await getCallDetail(repository, authUserId, callId);

  if (!detail.ok) {
    return detail;
  }

  const note = input.note.trim();

  if (!note) {
    return {
      ok: false,
      status: 400,
      code: "not_found",
      error: "note is required",
    };
  }

  const annotation = await repository.insertAnnotation({
    authorId: authUserId,
    callId,
    note,
    timestampSeconds: input.timestampSeconds ?? null,
  });

  const viewerResult = await getViewer(repository, authUserId);
  if (viewerResult.ok) {
    await repository.createNotification({
      body: `A new coaching annotation was added to ${detail.data.callTopic ?? "a call"}.`,
      link: `/calls/${callId}`,
      title: "Annotation added",
      type: "annotation_added",
      userId: detail.data.repId,
    });
  }

  return {
    ok: true,
    data: serializeAnnotation(annotation),
  };
}

export async function deleteAnnotation(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
  annotationId: string,
): Promise<ServiceResult<{ success: true }>> {
  const annotations = await listAnnotations(repository, authUserId, callId);

  if (!annotations.ok) {
    return annotations;
  }

  const targetAnnotation = annotations.data.annotations.find(
    (annotation) => annotation.id === annotationId,
  );

  if (!targetAnnotation) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      error: "Annotation not found",
    };
  }

  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  if (
    targetAnnotation.authorId !== authUserId &&
    !isManagerRole(viewerResult.data.role)
  ) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Only the annotation author or a manager can delete this note",
    };
  }

  const deleted = await repository.deleteAnnotation(annotationId, callId);

  return { ok: true, data: { success: true } };
}

export async function renameCall(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
  callTopic: string | null,
): Promise<ServiceResult<{ id: string; callTopic: string | null }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const detail = await getCallDetail(repository, authUserId, callId);

  if (!detail.ok) {
    return detail;
  }

  if (!isManagerRole(viewerResult.data.role) && detail.data.repId !== authUserId) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You can only edit your own calls",
    };
  }

  const updated = await repository.updateCallTopic(callId, callTopic?.trim() || null);

  return { ok: true, data: updated };
}

export async function toggleMomentHighlight(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
  momentId: string,
  input: { highlightNote?: string | null; isHighlight: boolean },
): Promise<ServiceResult<CallMoment>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  if (!isManagerRole(viewerResult.data.role)) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Only managers can highlight moments",
    };
  }

  const detail = await getCallDetail(repository, authUserId, callId);

  if (!detail.ok) {
    return detail;
  }

  const updated = await repository.updateMomentHighlight(
    callId,
    momentId,
    input.isHighlight,
    input.highlightNote?.trim() || null,
  );

  if (!updated) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      error: "Moment not found",
    };
  }

  return { ok: true, data: serializeMoment(updated) };
}

export async function listHighlights(
  repository: CallsRepository,
  authUserId: string,
): Promise<ServiceResult<{ highlights: CallHighlight[] }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  if (!viewer.org) {
    return { ok: true, data: { highlights: [] } };
  }

  const highlights =
    viewer.role === "rep"
      ? await repository.findHighlightsByRepId(viewer.id)
      : await repository.findHighlightsByOrgId(viewer.org.id);

  return {
    ok: true,
    data: { highlights: highlights.map(serializeHighlight) },
  };
}

export async function getScoreTrend(
  repository: CallsRepository,
  authUserId: string,
  params: { days?: number; repId?: string } = {},
): Promise<ServiceResult<{ points: ScoreTrendPoint[] }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  if (params.repId && params.repId !== viewer.id && !isManagerRole(viewer.role)) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Only managers can view other reps' score trends",
    };
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - Math.min(params.days ?? 90, 365));

  const repId = viewer.role === "rep" ? viewer.id : params.repId ?? viewer.id;
  const points = await repository.findScoreTrend(repId, since);

  return {
    ok: true,
    data: { points: points.map(serializeTrendPoint) },
  };
}

export async function uploadCall(
  repository: CallsRepository,
  authUserId: string,
  input: UploadCallInput,
): Promise<ServiceResult<UploadCallResult>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  if (!viewer.org) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "User must belong to an organization to upload calls",
    };
  }

  const created = await repository.createCall({
    orgId: viewer.org.id,
    repId: viewer.id,
    callTopic: input.callTopic?.trim() || deriveCallTopicFromFileName(input.fileName),
    durationSeconds: null,
    recordingUrl: null,
    transcriptUrl: null,
    consentConfirmed: true,
    status: "evaluating",
  });

  const evaluation = buildMockEvaluation(input.fileName, input.callTopic ?? null, input.fileSizeBytes);

  await repository.setCallEvaluation(created.id, evaluation);
  await repository.createNotification({
    body: `${input.callTopic?.trim() || deriveCallTopicFromFileName(input.fileName)} finished scoring with an ${evaluation.overallScore} overall score.`,
    link: `/calls/${created.id}`,
    title: "Call scored",
    type: "call_scored",
    userId: viewer.id,
  });

  return {
    ok: true,
    data: {
      id: created.id,
      status: "complete",
      createdAt: created.createdAt.toISOString(),
    },
  };
}

function deriveCallTopicFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim() || "Uploaded call";
}

function buildMockEvaluation(
  fileName: string,
  callTopic: string | null,
  fileSizeBytes: number,
): MockCallEvaluation {
  const seed = hashString(`${fileName}:${callTopic ?? ""}:${fileSizeBytes}`);
  const base = 62 + (seed % 19);

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
    ].reduce((sum, score) => sum + score, 0) / 7,
  );

  const categories = [
    ["Frame Control", frameControlScore],
    ["Rapport", rapportScore],
    ["Discovery", discoveryScore],
    ["Pain Expansion", painExpansionScore],
    ["Solution", solutionScore],
    ["Objection Handling", objectionScore],
    ["Closing", closingScore],
  ] as const;

  const sorted = [...categories].sort((left, right) => right[1] - left[1]);
  const strengths = sorted.slice(0, 2).map(([label]) => `${label} showed above-team execution`);
  const improvements = sorted.slice(-2).map(([label]) => `${label} needs tighter control and repetition`);
  const recommendedDrills = sorted
    .slice(-2)
    .map(([label]) => `${label} drill`);

  const topic = callTopic?.trim() || deriveCallTopicFromFileName(fileName);
  const durationSeconds = 420 + (seed % 780);
  const confidence = overallScore >= 85 ? "high" : overallScore >= 72 ? "medium" : "low";
  const callStageReached = overallScore >= 82 ? "closed_won" : overallScore >= 70 ? "proposal" : "discovery";

  const transcript: TranscriptLine[] = [
    { timestampSeconds: 12, speaker: "Rep", text: `Thanks for making time today. I wanted to use this call to unpack ${topic.toLowerCase()} and see whether Argos is a fit.` },
    { timestampSeconds: 47, speaker: "Prospect", text: "That works. We need better visibility into rep performance, but I need to understand the rollout effort." },
    { timestampSeconds: 118, speaker: "Rep", text: "What is breaking most often today when managers coach from memory instead of call evidence?" },
    { timestampSeconds: 194, speaker: "Prospect", text: "Consistency. Some reps improve quickly, but others repeat the same mistakes week after week." },
    { timestampSeconds: 286, speaker: "Rep", text: "If we could flag those moments automatically and feed the exact drill back into training, would that change the rollout math?" },
    { timestampSeconds: 351, speaker: "Prospect", text: "Yes, provided the workflow stays simple and we can see ROI in the first month." },
  ];

  const strongestCategory = sorted[0][0];
  const weakestCategory = sorted[sorted.length - 1][0];

  const moments: MockCallEvaluation["moments"] = [
    {
      timestampSeconds: 118,
      category: "discovery",
      observation: "The rep shifted from product pitch into diagnosis and uncovered the coaching consistency gap.",
      recommendation: "Double down on layered follow-up questions before presenting the solution.",
      severity: discoveryScore >= 80 ? "strength" : "improvement",
      isHighlight: discoveryScore >= 80,
      highlightNote: discoveryScore >= 80 ? "Strong discovery transition" : null,
    },
    {
      timestampSeconds: 194,
      category: weakestCategory.toLowerCase().replace(/\s+/g, "_"),
      observation: `${weakestCategory} was the least developed segment of the call.`,
      recommendation: `Practice a tighter ${weakestCategory.toLowerCase()} framework to move the conversation faster.`,
      severity: "improvement",
      isHighlight: false,
      highlightNote: null,
    },
    {
      timestampSeconds: 286,
      category: strongestCategory.toLowerCase().replace(/\s+/g, "_"),
      observation: `The rep connected the platform directly to the buyer's business outcome with strong ${strongestCategory.toLowerCase()}.`,
      recommendation: "Reuse this exact framing in future coaching examples.",
      severity: "strength",
      isHighlight: true,
      highlightNote: "Worth using as a team example",
    },
  ];

  return {
    confidence,
    durationSeconds,
    callStageReached,
    overallScore,
    frameControlScore,
    rapportScore,
    discoveryScore,
    painExpansionScore,
    solutionScore,
    objectionScore,
    closingScore,
    strengths,
    improvements,
    recommendedDrills,
    transcript,
    moments,
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
