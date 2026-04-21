import { createAccessRepository } from "@/lib/access/create-repository";
import {
  buildAccessContext,
  canActorUsePermissionForRep,
  canActorViewRep,
  type AccessContext,
} from "@/lib/access/service";
import type { AccessRepository } from "@/lib/access/repository.types";
import type { DashboardUserRecord } from "@/lib/dashboard/service";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { getActiveRubric, type RubricsRepository } from "@/lib/rubrics/service";
import type { AppUserRole } from "@/lib/users/roles";
import { storeManualCallSource, type SourceAsset } from "./ingestion-service";
import type { CallEvaluation, TranscriptLine } from "./types";
import { CALL_SCORE_LABELS_BY_FIELD } from "./rubric";

export type { TranscriptLine } from "./types";

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

export type CallRubric = {
  id: string;
  name: string;
  version: number;
  status: string | null;
};

export type CallCategoryScore = {
  categoryId: string | null;
  slug: string;
  name: string;
  description: string | null;
  weight: number | null;
  sortOrder: number | null;
  score: number | null;
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

export type CallDetail = CallSummary & {
  recordingUrl: string | null;
  transcriptUrl: string | null;
  rubric: CallRubric | null;
  categoryScores: CallCategoryScore[];
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
  recording: {
    bytes: Buffer;
    contentType: string | null;
  };
};

type StoreSourceAssetFunction = (input: {
  callId: string;
  bytes: Buffer;
  contentType: string | null;
  fileName: string;
}) => Promise<SourceAsset>;

type UploadCallDependencies = {
  rubricsRepository?: RubricsRepository;
  storeSourceAsset?: StoreSourceAssetFunction;
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
    rubricId?: string | null;
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
  deleteCall(callId: string): Promise<void>;
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
  findCallsByRepIds(
    repIds: string[],
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
  createOrResetCallProcessingJob(input: {
    callId: string;
    rubricId?: string | null;
    sourceOrigin: "manual_upload" | "zoom_recording";
    sourceStoragePath: string;
    sourceFileName: string;
    sourceContentType: string | null;
    sourceSizeBytes: number | null;
  }): Promise<void>;
  setCallEvaluation(callId: string, evaluation: CallEvaluation): Promise<void>;
  updateCallRecording(callId: string, recordingUrl: string | null): Promise<void>;
  updateCallStatus(
    callId: string,
    status: "uploaded" | "transcribing" | "evaluating" | "complete" | "failed",
  ): Promise<void>;
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

function serializeCategoryScore(categoryScore: CallCategoryScore): CallCategoryScore {
  return { ...categoryScore };
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
    rubric: call.rubric ? { ...call.rubric } : null,
    categoryScores: ((call.categoryScores?.length ? call.categoryScores : buildLegacyCategoryScores(call))
      .map(serializeCategoryScore)),
    transcript: Array.isArray(call.transcript) ? call.transcript : null,
    moments: call.moments.map(serializeMoment),
  };
}

function buildLegacyCategoryScores(call: Pick<
  CallDetailRecord,
  | "closingScore"
  | "discoveryScore"
  | "frameControlScore"
  | "objectionScore"
  | "overallScore"
  | "painExpansionScore"
  | "rapportScore"
  | "solutionScore"
>): CallCategoryScore[] {
  return [
    {
      categoryId: null,
      slug: "frame_control",
      name: CALL_SCORE_LABELS_BY_FIELD.frameControlScore,
      description: null,
      weight: 15,
      sortOrder: 1,
      score: call.frameControlScore,
    },
    {
      categoryId: null,
      slug: "rapport",
      name: CALL_SCORE_LABELS_BY_FIELD.rapportScore,
      description: null,
      weight: 5,
      sortOrder: 2,
      score: call.rapportScore,
    },
    {
      categoryId: null,
      slug: "discovery",
      name: CALL_SCORE_LABELS_BY_FIELD.discoveryScore,
      description: null,
      weight: 15,
      sortOrder: 3,
      score: call.discoveryScore,
    },
    {
      categoryId: null,
      slug: "pain_expansion",
      name: CALL_SCORE_LABELS_BY_FIELD.painExpansionScore,
      description: null,
      weight: 5,
      sortOrder: 4,
      score: call.painExpansionScore,
    },
    {
      categoryId: null,
      slug: "solution",
      name: CALL_SCORE_LABELS_BY_FIELD.solutionScore,
      description: null,
      weight: 15,
      sortOrder: 5,
      score: call.solutionScore,
    },
    {
      categoryId: null,
      slug: "objection_handling",
      name: CALL_SCORE_LABELS_BY_FIELD.objectionScore,
      description: null,
      weight: 15,
      sortOrder: 6,
      score: call.objectionScore,
    },
    {
      categoryId: null,
      slug: "closing",
      name: CALL_SCORE_LABELS_BY_FIELD.closingScore,
      description: null,
      weight: 30,
      sortOrder: 7,
      score: call.closingScore,
    },
  ];
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

async function resolveAccessContext(
  accessRepository: AccessRepository,
  authUserId: string,
): Promise<AccessContext | null> {
  const actor = await accessRepository.findActorByAuthUserId(authUserId);

  if (!actor?.orgId) {
    return null;
  }

  const [memberships, grants] = await Promise.all([
    accessRepository.findMembershipsByOrgId(actor.orgId),
    accessRepository.findGrantsByUserId(actor.id, actor.orgId),
  ]);

  return buildAccessContext({ actor, memberships, grants });
}

async function canActorAccessTargetRep(
  accessRepository: AccessRepository,
  access: AccessContext,
  repId: string,
) {
  const targetActor = await accessRepository.findActorByAuthUserId(repId);

  if (!targetActor?.orgId || targetActor.orgId !== access.actor.orgId || targetActor.role !== "rep") {
    return false;
  }

  return canActorViewRep(access, repId);
}

function getScopedCallRepIds(access: AccessContext) {
  const repIds = new Set<string>();
  for (const teamRepIds of access.repIdsByTeamId.values()) {
    for (const repId of teamRepIds) {
      if (!canActorViewRep(access, repId)) {
        continue;
      }

      repIds.add(repId);
    }
  }

  return repIds;
}

function canActorCoachRep(access: AccessContext, repId: string) {
  if (access.actor.role === "admin") {
    return true;
  }

  if (access.actor.role === "rep") {
    return access.actor.id === repId;
  }

  return canActorUsePermissionForRep(access, "coach_team_calls", repId);
}

function canActorDeleteOthersAnnotationForRep(access: AccessContext, repId: string) {
  if (access.actor.role === "admin") {
    return true;
  }

  return canActorUsePermissionForRep(access, "coach_team_calls", repId);
}

function canActorManageHighlights(access: AccessContext, repId: string) {
  if (access.actor.role === "admin") {
    return true;
  }

  return canActorUsePermissionForRep(access, "manage_call_highlights", repId);
}

export async function getCallHighlightManagementAccess(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<{ canManage: boolean }>> {
  const detail = await getCallDetail(repository, authUserId, callId, accessRepository);

  if (!detail.ok) {
    return detail;
  }

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return {
      ok: false,
      status: 404,
      code: "unprovisioned",
      error: "User is not provisioned in the app database",
    };
  }

  return {
    ok: true,
    data: { canManage: canActorManageHighlights(access, detail.data.repId) },
  };
}

export async function listCalls(
  repository: CallsRepository,
  authUserId: string,
  filters: CallsFilters = {},
  accessRepository: AccessRepository = createAccessRepository(),
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

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return {
      ok: false,
      status: 404,
      code: "unprovisioned",
      error: "User is not provisioned in the app database",
    };
  }

  if (filters.repId && !(await canActorAccessTargetRep(accessRepository, access, filters.repId))) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You do not have access to this rep",
    };
  }

  const result =
    filters.repId || viewer.role === "rep"
      ? await repository.findCallsByRepId(filters.repId ?? viewer.id, filters)
      : viewer.role === "admin" || viewer.role === "executive"
        ? await repository.findCallsByOrgId(viewer.org.id, filters)
        : await repository.findCallsByRepIds([...getScopedCallRepIds(access)], filters);

  const scopedCalls =
    filters.repId || viewer.role === "rep" || viewer.role === "admin" || viewer.role === "executive"
      ? result.calls
      : result.calls;

  return {
    ok: true,
    data: {
      calls: scopedCalls.map(serializeCallSummary),
      total: filters.repId || viewer.role === "rep" || viewer.role === "admin" || viewer.role === "executive"
        ? result.total
        : result.total,
      viewer: { fullName: buildViewerName(viewer), role: viewer.role },
    },
  };
}

export async function getCallDetail(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
  accessRepository: AccessRepository = createAccessRepository(),
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

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return {
      ok: false,
      status: 404,
      code: "unprovisioned",
      error: "User is not provisioned in the app database",
    };
  }

  if (!canActorViewRep(access, call.repId)) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You do not have access to this rep",
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
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<{ id: string; status: string; overallScore: number | null }>> {
  const detail = await getCallDetail(repository, authUserId, callId, accessRepository);

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
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<{ annotations: CallAnnotation[] }>> {
  const detail = await getCallDetail(repository, authUserId, callId, accessRepository);

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
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<CallAnnotation>> {
  const detail = await getCallDetail(repository, authUserId, callId, accessRepository);

  if (!detail.ok) {
    return detail;
  }

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return {
      ok: false,
      status: 404,
      code: "unprovisioned",
      error: "User is not provisioned in the app database",
    };
  }

  if (!canActorCoachRep(access, detail.data.repId)) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You do not have permission to coach this rep",
    };
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
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<{ success: true }>> {
  const detail = await getCallDetail(repository, authUserId, callId, accessRepository);

  if (!detail.ok) {
    return detail;
  }

  const annotations = await repository.findAnnotations(callId);

  const targetAnnotation = annotations
    .map(serializeAnnotation)
    .find((annotation) => annotation.id === annotationId);

  if (!targetAnnotation) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      error: "Annotation not found",
    };
  }

  if (targetAnnotation.authorId !== authUserId) {
    const access = await resolveAccessContext(accessRepository, authUserId);

    if (!access) {
      return {
        ok: false,
        status: 404,
        code: "unprovisioned",
        error: "User is not provisioned in the app database",
      };
    }

    if (!canActorDeleteOthersAnnotationForRep(access, detail.data.repId)) {
      return {
        ok: false,
        status: 403,
        code: "forbidden",
        error: "Only the annotation author or a manager with coaching access can delete this note",
      };
    }
  }

  const deleted = await repository.deleteAnnotation(annotationId, callId);

  return { ok: true, data: { success: true } };
}

export async function renameCall(
  repository: CallsRepository,
  authUserId: string,
  callId: string,
  callTopic: string | null,
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<{ id: string; callTopic: string | null }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const detail = await getCallDetail(repository, authUserId, callId, accessRepository);

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
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<CallMoment>> {
  const detail = await getCallDetail(repository, authUserId, callId, accessRepository);

  if (!detail.ok) {
    return detail;
  }

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return {
      ok: false,
      status: 404,
      code: "unprovisioned",
      error: "User is not provisioned in the app database",
    };
  }

  if (!canActorManageHighlights(access, detail.data.repId)) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Only managers with highlight access can update moments",
    };
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
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<{ highlights: CallHighlight[] }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  if (!viewer.org) {
    return { ok: true, data: { highlights: [] } };
  }

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return {
      ok: false,
      status: 404,
      code: "unprovisioned",
      error: "User is not provisioned in the app database",
    };
  }

  const highlights =
    viewer.role === "rep"
      ? await repository.findHighlightsByRepId(viewer.id)
      : await repository.findHighlightsByOrgId(viewer.org.id);

  const scopedHighlights =
    viewer.role === "admin" || viewer.role === "executive"
      ? highlights
      : highlights.filter((highlight) => canActorViewRep(access, highlight.repId ?? ""));

  return {
    ok: true,
    data: { highlights: scopedHighlights.map(serializeHighlight) },
  };
}

export async function getScoreTrend(
  repository: CallsRepository,
  authUserId: string,
  params: { days?: number; repId?: string } = {},
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ServiceResult<{ points: ScoreTrendPoint[] }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return {
      ok: false,
      status: 404,
      code: "unprovisioned",
      error: "User is not provisioned in the app database",
    };
  }

  const targetRepId = params.repId ?? viewer.id;

  if (
    targetRepId !== viewer.id &&
    !(await canActorAccessTargetRep(accessRepository, access, targetRepId))
  ) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You do not have access to this rep",
    };
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - Math.min(params.days ?? 90, 365));

  const points = await repository.findScoreTrend(targetRepId, since);

  return {
    ok: true,
    data: { points: points.map(serializeTrendPoint) },
  };
}

export async function uploadCall(
  repository: CallsRepository,
  authUserId: string,
  input: UploadCallInput,
  dependencies: UploadCallDependencies = {},
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

  const topic = input.callTopic?.trim() || deriveCallTopicFromFileName(input.fileName);
  const storeSourceAsset = dependencies.storeSourceAsset ?? storeManualCallSource;
  const rubricsRepository = dependencies.rubricsRepository ?? createRubricsRepository();
  const activeRubric = await getActiveRubric(rubricsRepository, viewer.org.id);
  const rubricId = activeRubric.ok ? activeRubric.data.id : null;
  const created = await repository.createCall({
    orgId: viewer.org.id,
    repId: viewer.id,
    rubricId,
    callTopic: topic,
    durationSeconds: null,
    recordingUrl: null,
    transcriptUrl: null,
    consentConfirmed: true,
    status: "uploaded",
  });

  try {
    const sourceAsset = await storeSourceAsset({
      callId: created.id,
      bytes: input.recording.bytes,
      contentType: input.recording.contentType,
      fileName: input.fileName,
    });

    await repository.updateCallRecording(created.id, sourceAsset.publicUrl);
    await repository.createOrResetCallProcessingJob({
      callId: created.id,
      rubricId,
      sourceOrigin: "manual_upload",
      sourceStoragePath: sourceAsset.storagePath,
      sourceFileName: input.fileName,
      sourceContentType: input.recording.contentType,
      sourceSizeBytes: input.fileSizeBytes,
    });

    return {
      ok: true,
      data: {
        id: created.id,
        status: "uploaded",
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch (error) {
    try {
      await repository.updateCallStatus(created.id, "failed");
    } catch (statusError) {
      console.error("Failed to mark queued upload as failed", statusError);
      await repository.deleteCall(created.id).catch((deleteError) => {
        console.error("Failed to clean up queued upload after status update failure", deleteError);
      });
    }

    throw error;
  }
}

function deriveCallTopicFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim() || "Uploaded call";
}
