import { describe, expect, it, vi } from "vitest";
import {
  createAnnotation,
  createCallRecordingSignedUrl,
  deleteCallData,
  deleteAnnotation,
  getCallDetail,
  listCalls,
  retryCallProcessingJob,
  toggleMomentHighlight,
  type CallsRepository,
} from "./service";

function createRepository(
  overrides: Partial<CallsRepository> = {},
): CallsRepository {
  return {
    createCall: vi.fn(),
    createNotification: vi.fn(),
    deleteAnnotation: vi.fn(),
    findAnnotations: vi.fn(),
    findCallById: vi.fn(),
    findCallProcessingJobByCallId: vi.fn(),
    findCallRecordingReference: vi.fn(),
    findCallsByOrgId: vi.fn(),
    findCallsByRepId: vi.fn(),
    findCallsByRepIds: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findHighlightsByOrgId: vi.fn(),
    findHighlightsByRepId: vi.fn(),
    findScoreTrend: vi.fn(),
    insertAnnotation: vi.fn(),
    retryCallProcessingJob: vi.fn(),
    setCallEvaluation: vi.fn(),
    updateCallTopic: vi.fn(),
    updateCallRecordingStorage: vi.fn(),
    updateMomentHighlight: vi.fn(),
    ...overrides,
  } as unknown as CallsRepository;
}

function createAccessRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActorByAuthUserId: vi.fn(),
    findMembershipsByOrgId: vi.fn(),
    findGrantsByUserId: vi.fn(),
    ...overrides,
  } as {
    findActorByAuthUserId: (authUserId: string) => Promise<{ id: string; role: string; orgId: string | null } | null>;
    findMembershipsByOrgId: (orgId: string) => Promise<Array<{ orgId: string; teamId: string; userId: string; membershipType: "rep" | "manager" }>>;
    findGrantsByUserId: (userId: string, orgId: string) => Promise<Array<{ orgId: string; teamId: string; userId: string; permissionKey: "view_team_calls" | "coach_team_calls" | "manage_call_highlights" | "view_team_training" | "manage_team_training" | "manage_team_roster" | "view_team_analytics" }>>;
  };
}

const adminViewer = {
  id: "admin-1",
  email: "admin@argos.ai",
  role: "admin",
  firstName: "Ada",
  lastName: "Admin",
  org: { id: "org-1", name: "Argos", slug: "argos", plan: "team" },
};

const managerViewer = {
  id: "manager-1",
  email: "manager@argos.ai",
  role: "manager",
  firstName: "Morgan",
  lastName: "Lane",
  org: { id: "org-1", name: "Argos", slug: "argos", plan: "team" },
};

const repViewer = {
  id: "rep-1",
  email: "rep@argos.ai",
  role: "rep",
  firstName: "Riley",
  lastName: "Stone",
  org: { id: "org-1", name: "Argos", slug: "argos", plan: "team" },
};

const baseCallRecord = {
  id: "call-1",
  repId: "rep-1",
  orgId: "org-1",
  status: "complete",
  recordingUrl: null,
  transcriptUrl: null,
  durationSeconds: 1200,
  callTopic: "ACME discovery",
  overallScore: 84,
  frameControlScore: 80,
  rapportScore: 82,
  discoveryScore: 79,
  painExpansionScore: 76,
  solutionScore: 85,
  objectionScore: 78,
  closingScore: 88,
  confidence: "high",
  callStageReached: "close",
  strengths: [],
  improvements: [],
  recommendedDrills: [],
  transcript: [],
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  repFirstName: "Riley",
  repLastName: "Stone",
  moments: [],
  rubric: null,
  categoryScores: [],
};

function adminAccessRepository() {
  return createAccessRepository({
    findActorByAuthUserId: vi.fn().mockResolvedValue({
      id: "admin-1",
      role: "admin",
      orgId: "org-1",
    }),
    findMembershipsByOrgId: vi.fn().mockResolvedValue([
      { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
    ]),
    findGrantsByUserId: vi.fn().mockResolvedValue([]),
  });
}

function managerAccessRepository() {
  return createAccessRepository({
    findActorByAuthUserId: vi.fn().mockResolvedValue({
      id: "manager-1",
      role: "manager",
      orgId: "org-1",
    }),
    findMembershipsByOrgId: vi.fn().mockResolvedValue([
      { orgId: "org-1", teamId: "team-a", userId: "manager-1", membershipType: "manager" },
      { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
    ]),
    findGrantsByUserId: vi.fn().mockResolvedValue([
      { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "view_team_calls" },
    ]),
  });
}

function repAccessRepository() {
  return createAccessRepository({
    findActorByAuthUserId: vi.fn().mockResolvedValue({
      id: "rep-1",
      role: "rep",
      orgId: "org-1",
    }),
    findMembershipsByOrgId: vi.fn().mockResolvedValue([
      { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
    ]),
    findGrantsByUserId: vi.fn().mockResolvedValue([]),
  });
}

describe("listCalls", () => {
  it("returns an empty list for managers without scoped reps", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", membershipType: "manager" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "view_team_calls" },
      ]),
    });

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallsByRepIds: vi.fn().mockRejectedValue(new Error("empty rep scope must not query calls")),
    });

    const result = await listCalls(
      repository,
      "manager-1",
      { limit: 25, offset: 0 },
      accessRepository as never,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected empty scoped calls");
    expect(result.data.calls).toEqual([]);
    expect(result.data.total).toBe(0);
    expect(repository.findCallsByRepIds).not.toHaveBeenCalled();
    expect(repository.findCallsByOrgId).not.toHaveBeenCalled();
    expect(repository.findCallsByRepId).not.toHaveBeenCalled();
  });

  it("queries managers through team-scoped rep ids instead of org-wide pagination", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { orgId: "org-1", teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "view_team_calls" },
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "coach_team_calls" },
      ]),
    });

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallsByRepIds: vi.fn().mockResolvedValue({
        calls: [
          {
            id: "call-1",
            status: "complete",
            overallScore: 89,
            durationSeconds: 900,
            callTopic: "ACME",
            repId: "rep-1",
            createdAt: new Date("2026-04-03T00:00:00.000Z"),
            repFirstName: "Riley",
            repLastName: "Stone",
          },
        ],
        total: 7,
      }),
    });

    const result = await listCalls(
      repository,
      "manager-1",
      { limit: 1, offset: 1 },
      accessRepository as never,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected scoped calls");
    expect(repository.findCallsByRepIds).toHaveBeenCalledWith(["rep-1"], { limit: 1, offset: 1 });
    expect(repository.findCallsByOrgId).not.toHaveBeenCalled();
    expect(result.data.total).toBe(7);
    expect(result.data.calls).toHaveLength(1);
    expect(result.data.calls[0].repId).toBe("rep-1");
  });
});

describe("processing job recovery", () => {
  it.each(["pending", "running", "retrying", "failed", "complete"] as const)(
    "returns admin-visible %s job state with call status",
    async (jobStatus) => {
      const repository = createRepository({
        findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminViewer),
        findCallById: vi.fn().mockResolvedValue(baseCallRecord),
        findCallProcessingJobByCallId: vi.fn().mockResolvedValue({
          id: "job-1",
          status: jobStatus,
          attemptCount: 2,
          maxAttempts: 3,
          nextRunAt: new Date("2026-04-03T00:10:00.000Z"),
          lastStage: "transcribe",
          lastError: jobStatus === "failed" ? "OpenAI transcription request failed: 429" : null,
          updatedAt: new Date("2026-04-03T00:05:00.000Z"),
        }),
      });

      const result = await getCallDetail(
        repository,
        "admin-1",
        "call-1",
        adminAccessRepository() as never,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected call detail");
      expect(result.data.processingJob).toMatchObject({
        id: "job-1",
        status: jobStatus,
        attemptCount: 2,
        maxAttempts: 3,
        lastStage: "transcribe",
      });
      expect(result.data.processingJob?.nextRunAt).toBe("2026-04-03T00:10:00.000Z");
      expect(result.data.processingJob?.updatedAt).toBe("2026-04-03T00:05:00.000Z");
    },
  );

  it("does not expose processing job failure detail to reps", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(repViewer),
      findCallById: vi.fn().mockResolvedValue(baseCallRecord),
      findCallProcessingJobByCallId: vi.fn().mockRejectedValue(
        new Error("rep detail must not read operator jobs"),
      ),
    });

    const result = await getCallDetail(
      repository,
      "rep-1",
      "call-1",
      repAccessRepository() as never,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected call detail");
    expect(result.data.processingJob).toBeNull();
    expect(repository.findCallProcessingJobByCallId).not.toHaveBeenCalled();
  });

  it("lets admins requeue failed processing jobs", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminViewer),
      findCallById: vi.fn().mockResolvedValue({
        ...baseCallRecord,
        status: "failed",
      }),
      findCallProcessingJobByCallId: vi.fn().mockResolvedValue({
        id: "job-1",
        status: "failed",
        attemptCount: 3,
        maxAttempts: 3,
        nextRunAt: new Date("2026-04-03T00:00:00.000Z"),
        lastStage: "score",
        lastError: "Scoring failed",
        updatedAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      retryCallProcessingJob: vi.fn().mockResolvedValue({
        id: "job-1",
        status: "pending",
        attemptCount: 0,
        maxAttempts: 3,
        nextRunAt: new Date("2026-04-03T00:15:00.000Z"),
        lastStage: null,
        lastError: null,
        updatedAt: new Date("2026-04-03T00:15:00.000Z"),
      }),
    });

    const result = await retryCallProcessingJob(
      repository,
      "admin-1",
      "call-1",
      adminAccessRepository() as never,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected retry result");
    expect(repository.retryCallProcessingJob).toHaveBeenCalledWith("call-1");
    expect(result.data.processingJob).toMatchObject({
      id: "job-1",
      status: "pending",
      attemptCount: 0,
      lastError: null,
    });
  });

  it("blocks managers from requeueing processing jobs", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(managerViewer),
      findCallById: vi.fn().mockResolvedValue(baseCallRecord),
      findCallProcessingJobByCallId: vi.fn().mockResolvedValue({
        id: "job-1",
        status: "failed",
        attemptCount: 3,
        maxAttempts: 3,
        nextRunAt: new Date("2026-04-03T00:00:00.000Z"),
        lastStage: "score",
        lastError: "Scoring failed",
        updatedAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await retryCallProcessingJob(
      repository,
      "manager-1",
      "call-1",
      managerAccessRepository() as never,
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "forbidden",
    });
    expect(repository.retryCallProcessingJob).not.toHaveBeenCalled();
  });
});

describe("recording and transcript lifecycle", () => {
  it("lets admins delete call data and remove private recording storage", async () => {
    const removeStorageObjects = vi.fn().mockResolvedValue(undefined);
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminViewer),
      findCallById: vi.fn().mockResolvedValue(baseCallRecord),
      findCallRecordingReference: vi.fn().mockResolvedValue({
        storageBucket: "call-recordings",
        storagePath: "recordings/call-1/source/demo.mp3",
        contentType: "audio/mpeg",
        fileSizeBytes: 1234,
        recordingUrl: null,
      }),
      deleteCall: vi.fn().mockResolvedValue(undefined),
    });

    const result = await deleteCallData(repository, "admin-1", "call-1", {
      accessRepository: adminAccessRepository() as never,
      removeStorageObjects,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        deletedStorageObjects: 1,
        success: true,
      },
    });
    expect(removeStorageObjects).toHaveBeenCalledWith([
      { bucket: "call-recordings", path: "recordings/call-1/source/demo.mp3" },
    ]);
    expect(repository.deleteCall).toHaveBeenCalledWith("call-1");
  });

  it("blocks managers from deleting call lifecycle data", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(managerViewer),
      findCallById: vi.fn().mockResolvedValue(baseCallRecord),
      deleteCall: vi.fn().mockResolvedValue(undefined),
    });

    const result = await deleteCallData(repository, "manager-1", "call-1", {
      accessRepository: managerAccessRepository() as never,
      removeStorageObjects: vi.fn(),
    });

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "forbidden",
    });
    expect(repository.deleteCall).not.toHaveBeenCalled();
  });
});

describe("deleteAnnotation", () => {
  it("allows the annotation author to delete their own note", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-1",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findAnnotations: vi.fn().mockResolvedValue([
        {
          id: "annotation-1",
          callId: "call-1",
          authorId: "rep-1",
          timestampSeconds: null,
          note: "Own note",
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
          authorFirstName: "Riley",
          authorLastName: "Stone",
          authorRole: "rep",
        },
      ]),
      deleteAnnotation: vi.fn().mockResolvedValue(true),
    });

    const result = await deleteAnnotation(
      repository,
      "rep-1",
      "call-1",
      "annotation-1",
      accessRepository as never,
    );

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(repository.deleteAnnotation).toHaveBeenCalledWith("annotation-1", "call-1");
  });

  it("allows managers to delete another user's annotation", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "view_team_calls" },
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "coach_team_calls" },
      ]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findAnnotations: vi.fn().mockResolvedValue([
        {
          id: "annotation-1",
          callId: "call-1",
          authorId: "rep-1",
          timestampSeconds: null,
          note: "Rep note",
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
          authorFirstName: "Riley",
          authorLastName: "Stone",
          authorRole: "rep",
        },
      ]),
      deleteAnnotation: vi.fn().mockResolvedValue(true),
    });

    const result = await deleteAnnotation(
      repository,
      "manager-1",
      "call-1",
      "annotation-1",
      accessRepository as never,
    );

    expect(result).toEqual({ ok: true, data: { success: true } });
    expect(repository.deleteAnnotation).toHaveBeenCalledWith("annotation-1", "call-1");
  });

  it("blocks a non-manager from deleting someone else's annotation", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-2",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-2", membershipType: "rep" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-2",
        email: "other@argos.ai",
        role: "rep",
        firstName: "Taylor",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-2",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Taylor",
        repLastName: "Stone",
        moments: [],
      }),
      findAnnotations: vi.fn().mockResolvedValue([
        {
          id: "annotation-1",
          callId: "call-1",
          authorId: "rep-1",
          timestampSeconds: null,
          note: "Rep note",
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
          authorFirstName: "Riley",
          authorLastName: "Stone",
          authorRole: "rep",
        },
      ]),
      deleteAnnotation: vi.fn().mockResolvedValue(true),
    });

    const result = await deleteAnnotation(
      repository,
      "rep-2",
      "call-1",
      "annotation-1",
      accessRepository as never,
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Only the annotation author or a manager with coaching access can delete this note",
    });
    expect(repository.deleteAnnotation).not.toHaveBeenCalled();
  });
});

describe("createAnnotation", () => {
  it("blocks managers without coaching grants from adding annotations", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "view_team_calls" },
      ]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      insertAnnotation: vi.fn(),
    });

    const result = await createAnnotation(
      repository,
      "manager-1",
      "call-1",
      { note: "Coach this opener" },
      accessRepository as never,
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You do not have permission to coach this rep",
    });
    expect(repository.insertAnnotation).not.toHaveBeenCalled();
  });
});

describe("toggleMomentHighlight", () => {
  it("requires highlight-specific grants for managers", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "manager-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "view_team_calls" },
      ]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "manager-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      updateMomentHighlight: vi.fn(),
    });

    const result = await toggleMomentHighlight(
      repository,
      "manager-1",
      "call-1",
      "moment-1",
      { isHighlight: true },
      accessRepository as never,
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Only managers with highlight access can update moments",
    });
    expect(repository.updateMomentHighlight).not.toHaveBeenCalled();
  });
});

describe("getCallDetail", () => {
  it("blocks a manager from viewing a rep outside granted teams", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "mgr-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
        { orgId: "org-1", teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_calls" },
      ]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "mgr-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-for-rep-2",
        repId: "rep-2",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Taylor",
        repLastName: "Stone",
        moments: [],
      }),
    });

    const result = await getCallDetail(
      repository,
      "mgr-1",
      "call-for-rep-2",
      accessRepository as never,
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "forbidden",
    });
  });
});

describe("createCallRecordingSignedUrl", () => {
  it("reuses call detail access checks before signing the private storage path", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "mgr-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", permissionKey: "view_team_calls" },
      ]),
    });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example/signed-token" },
      error: null,
    });
    const from = vi.fn().mockReturnValue({ createSignedUrl });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "mgr-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findCallRecordingReference: vi.fn().mockResolvedValue({
        storageBucket: "call-recordings",
        storagePath: "recordings/call-1/source/demo.mp3",
        contentType: "audio/mpeg",
        fileSizeBytes: 1024,
        recordingUrl: null,
      }),
    });

    const result = await createCallRecordingSignedUrl(
      repository,
      "mgr-1",
      "call-1",
      {
        accessRepository: accessRepository as never,
        storage: { from } as never,
      },
    );

    expect(result).toEqual({
      ok: true,
      data: {
        url: "https://storage.example/signed-token",
        expiresInSeconds: 300,
      },
    });
    expect(repository.findCallById).toHaveBeenCalledWith("call-1");
    expect(repository.findCallRecordingReference).toHaveBeenCalledWith("call-1");
    expect(from).toHaveBeenCalledWith("call-recordings");
    expect(createSignedUrl).toHaveBeenCalledWith("recordings/call-1/source/demo.mp3", 300);
  });

  it("signs recognizable legacy call-recordings public URLs with decoded object paths", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-1",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example/signed-legacy-token" },
      error: null,
    });
    const from = vi.fn().mockReturnValue({ createSignedUrl });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: "https://project.supabase.co/storage/v1/object/public/call-recordings/recordings/call-1/source/demo%20call.mp3?download=1",
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findCallRecordingReference: vi.fn().mockResolvedValue({
        storageBucket: null,
        storagePath: null,
        contentType: null,
        fileSizeBytes: null,
        recordingUrl: "https://project.supabase.co/storage/v1/object/public/call-recordings/recordings/call-1/source/demo%20call.mp3?download=1",
      }),
    });

    try {
      const result = await createCallRecordingSignedUrl(
        repository,
        "rep-1",
        "call-1",
        {
          accessRepository: accessRepository as never,
          storage: { from } as never,
        },
      );

      expect(result).toEqual({
        ok: true,
        data: {
          url: "https://storage.example/signed-legacy-token",
          expiresInSeconds: 300,
        },
      });
      expect(from).toHaveBeenCalledWith("call-recordings");
      expect(createSignedUrl).toHaveBeenCalledWith("recordings/call-1/source/demo call.mp3", 300);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not sign non-Supabase URLs that contain the call-recordings public marker", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-1",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const createSignedUrl = vi.fn();
    const legacyUrl = "https://cdn.example.com/storage/v1/object/public/call-recordings/recordings/call-1/source/demo.mp3";
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: legacyUrl,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findCallRecordingReference: vi.fn().mockResolvedValue({
        storageBucket: null,
        storagePath: null,
        contentType: null,
        fileSizeBytes: null,
        recordingUrl: legacyUrl,
      }),
    });

    try {
      const result = await createCallRecordingSignedUrl(
        repository,
        "rep-1",
        "call-1",
        {
          accessRepository: accessRepository as never,
          storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) } as never,
        },
      );

      expect(result).toEqual({
        ok: true,
        data: {
          url: legacyUrl,
          expiresInSeconds: null,
        },
      });
      expect(createSignedUrl).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("treats Supabase-cloud legacy URLs as external when Supabase URL is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-1",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const createSignedUrl = vi.fn();
    const legacyUrl = "https://project.supabase.co/storage/v1/object/public/call-recordings/recordings/call-1/source/demo.mp3";
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: legacyUrl,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findCallRecordingReference: vi.fn().mockResolvedValue({
        storageBucket: null,
        storagePath: null,
        contentType: null,
        fileSizeBytes: null,
        recordingUrl: legacyUrl,
      }),
    });

    try {
      const result = await createCallRecordingSignedUrl(
        repository,
        "rep-1",
        "call-1",
        {
          accessRepository: accessRepository as never,
          storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) } as never,
        },
      );

      expect(result).toEqual({
        ok: true,
        data: {
          url: legacyUrl,
          expiresInSeconds: null,
        },
      });
      expect(createSignedUrl).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("treats different Supabase project legacy URLs as external", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://configured.supabase.co");
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-1",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const createSignedUrl = vi.fn();
    const legacyUrl = "https://other-project.supabase.co/storage/v1/object/public/call-recordings/recordings/call-1/source/demo.mp3";
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: legacyUrl,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findCallRecordingReference: vi.fn().mockResolvedValue({
        storageBucket: null,
        storagePath: null,
        contentType: null,
        fileSizeBytes: null,
        recordingUrl: legacyUrl,
      }),
    });

    try {
      const result = await createCallRecordingSignedUrl(
        repository,
        "rep-1",
        "call-1",
        {
          accessRepository: accessRepository as never,
          storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) } as never,
        },
      );

      expect(result).toEqual({
        ok: true,
        data: {
          url: legacyUrl,
          expiresInSeconds: null,
        },
      });
      expect(createSignedUrl).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("returns external legacy recording URLs without signing them as private bucket paths", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-1",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const createSignedUrl = vi.fn();
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: "https://cdn.example.com/legacy/demo.mp3",
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findCallRecordingReference: vi.fn().mockResolvedValue({
        storageBucket: null,
        storagePath: null,
        contentType: null,
        fileSizeBytes: null,
        recordingUrl: "https://cdn.example.com/legacy/demo.mp3",
      }),
    });

    const result = await createCallRecordingSignedUrl(
      repository,
      "rep-1",
      "call-1",
      {
        accessRepository: accessRepository as never,
        storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) } as never,
      },
    );

    expect(result).toEqual({
      ok: true,
      data: {
        url: "https://cdn.example.com/legacy/demo.mp3",
        expiresInSeconds: null,
      },
    });
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("does not sign a URL when the caller fails existing call access checks", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "mgr-1",
        role: "manager",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "mgr-1", membershipType: "manager" },
        { orgId: "org-1", teamId: "team-b", userId: "rep-2", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const createSignedUrl = vi.fn();
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "mgr-1",
        email: "manager@argos.ai",
        role: "manager",
        firstName: "Morgan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-2",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Taylor",
        repLastName: "Stone",
        moments: [],
      }),
      findCallRecordingReference: vi.fn(),
    });

    const result = await createCallRecordingSignedUrl(
      repository,
      "mgr-1",
      "call-1",
      {
        accessRepository: accessRepository as never,
        storage: { from: vi.fn().mockReturnValue({ createSignedUrl }) } as never,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "forbidden",
    });
    expect(repository.findCallRecordingReference).not.toHaveBeenCalled();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns not found when the authorized call has no private storage path", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "rep-1",
        role: "rep",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([
        { orgId: "org-1", teamId: "team-a", userId: "rep-1", membershipType: "rep" },
      ]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "rep-1",
        email: "rep@argos.ai",
        role: "rep",
        firstName: "Riley",
        lastName: "Stone",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallById: vi.fn().mockResolvedValue({
        id: "call-1",
        repId: "rep-1",
        orgId: "org-1",
        status: "complete",
        recordingUrl: null,
        transcriptUrl: null,
        durationSeconds: 1200,
        callTopic: "ACME",
        overallScore: 84,
        frameControlScore: 80,
        rapportScore: 82,
        discoveryScore: 79,
        painExpansionScore: 76,
        solutionScore: 85,
        objectionScore: 78,
        closingScore: 88,
        confidence: "high",
        callStageReached: "close",
        strengths: [],
        improvements: [],
        recommendedDrills: [],
        transcript: [],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        repFirstName: "Riley",
        repLastName: "Stone",
        moments: [],
      }),
      findCallRecordingReference: vi.fn().mockResolvedValue(null),
    });

    const result = await createCallRecordingSignedUrl(
      repository,
      "rep-1",
      "call-1",
      {
        accessRepository: accessRepository as never,
        storage: { from: vi.fn() } as never,
      },
    );

    expect(result).toEqual({
      ok: false,
      status: 404,
      code: "not_found",
      error: "Recording is not available",
    });
  });
});
