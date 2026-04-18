import { describe, expect, it, vi } from "vitest";
import {
  createAnnotation,
  deleteAnnotation,
  getCallDetail,
  getCallHighlightManagementAccess,
  getScoreTrend,
  listCalls,
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
    findCallsByOrgId: vi.fn(),
    findCallsByRepId: vi.fn(),
    findCallsByRepIds: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findHighlightsByOrgId: vi.fn(),
    findHighlightsByRepId: vi.fn(),
    findScoreTrend: vi.fn(),
    insertAnnotation: vi.fn(),
    setCallEvaluation: vi.fn(),
    updateCallTopic: vi.fn(),
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

describe("listCalls", () => {
  it("blocks org admins from filtering calls for reps in another org", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi
        .fn()
        .mockImplementation(async (authUserId: string) => {
          if (authUserId === "admin-1") {
            return { id: "admin-1", role: "admin", orgId: "org-1" };
          }

          if (authUserId === "rep-foreign") {
            return { id: "rep-foreign", role: "rep", orgId: "org-2" };
          }

          return null;
        }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "admin-1",
        email: "admin@argos.ai",
        role: "admin",
        firstName: "Jordan",
        lastName: "Lane",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findCallsByRepId: vi.fn().mockResolvedValue({
        calls: [],
        total: 0,
      }),
    });

    const result = await listCalls(
      repository,
      "admin-1",
      { repId: "rep-foreign" },
      accessRepository as never,
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You do not have access to this rep",
    });
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

describe("getScoreTrend", () => {
  it("blocks cross-org trend lookups even for executives", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi
        .fn()
        .mockImplementation(async (authUserId: string) => {
          if (authUserId === "exec-1") {
            return { id: "exec-1", role: "executive", orgId: "org-1" };
          }

          if (authUserId === "rep-foreign") {
            return { id: "rep-foreign", role: "rep", orgId: "org-2" };
          }

          return null;
        }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });

    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "exec-1",
        email: "exec@argos.ai",
        role: "executive",
        firstName: "Avery",
        lastName: "Cross",
        org: { id: "org-1", name: "Argos", slug: "argos", plan: "trial" },
      }),
      findScoreTrend: vi.fn().mockResolvedValue([]),
    });

    const result = await getScoreTrend(
      repository,
      "exec-1",
      { repId: "rep-foreign" },
      accessRepository as never,
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "forbidden",
      error: "You do not have access to this rep",
    });
    expect(repository.findScoreTrend).not.toHaveBeenCalled();
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

  it("persists a trimmed note when highlighting a moment", async () => {
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
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "manage_call_highlights" },
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
      updateMomentHighlight: vi.fn().mockResolvedValue({
        id: "moment-1",
        callId: "call-1",
        timestampSeconds: 132,
        category: "Discovery",
        observation: "Strong transition",
        recommendation: "Replay this in team coaching.",
        severity: "strength",
        isHighlight: true,
        highlightNote: "Use this in the team review.",
        createdAt: new Date("2026-04-01T00:02:12.000Z"),
      }),
    });

    const result = await toggleMomentHighlight(
      repository,
      "manager-1",
      "call-1",
      "moment-1",
      { isHighlight: true, highlightNote: "  Use this in the team review.  " },
      accessRepository as never,
    );

    expect(repository.updateMomentHighlight).toHaveBeenCalledWith(
      "call-1",
      "moment-1",
      true,
      "Use this in the team review.",
    );
    expect(result).toEqual({
      ok: true,
      data: {
        id: "moment-1",
        callId: "call-1",
        timestampSeconds: 132,
        category: "Discovery",
        observation: "Strong transition",
        recommendation: "Replay this in team coaching.",
        severity: "strength",
        isHighlight: true,
        highlightNote: "Use this in the team review.",
        createdAt: "2026-04-01T00:02:12.000Z",
      },
    });
  });

  it("clears a saved note without removing the highlight", async () => {
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
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "manage_call_highlights" },
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
      updateMomentHighlight: vi.fn().mockResolvedValue({
        id: "moment-1",
        callId: "call-1",
        timestampSeconds: 132,
        category: "Discovery",
        observation: "Strong transition",
        recommendation: "Replay this in team coaching.",
        severity: "strength",
        isHighlight: true,
        highlightNote: null,
        createdAt: new Date("2026-04-01T00:02:12.000Z"),
      }),
    });

    const result = await toggleMomentHighlight(
      repository,
      "manager-1",
      "call-1",
      "moment-1",
      { isHighlight: true, highlightNote: "   " },
      accessRepository as never,
    );

    expect(repository.updateMomentHighlight).toHaveBeenCalledWith(
      "call-1",
      "moment-1",
      true,
      null,
    );
    expect(result).toEqual({
      ok: true,
      data: {
        id: "moment-1",
        callId: "call-1",
        timestampSeconds: 132,
        category: "Discovery",
        observation: "Strong transition",
        recommendation: "Replay this in team coaching.",
        severity: "strength",
        isHighlight: true,
        highlightNote: null,
        createdAt: "2026-04-01T00:02:12.000Z",
      },
    });
  });
});

describe("getCallHighlightManagementAccess", () => {
  it("returns true for managers with the highlight-management grant", async () => {
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
        { orgId: "org-1", teamId: "team-a", userId: "manager-1", permissionKey: "manage_call_highlights" },
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
    });

    const result = await getCallHighlightManagementAccess(
      repository,
      "manager-1",
      "call-1",
      accessRepository as never,
    );

    expect(result).toEqual({
      ok: true,
      data: { canManage: true },
    });
  });

  it("returns false for executives who can view the call but cannot manage highlights", async () => {
    const accessRepository = createAccessRepository({
      findActorByAuthUserId: vi.fn().mockResolvedValue({
        id: "exec-1",
        role: "executive",
        orgId: "org-1",
      }),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([]),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
    });
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "exec-1",
        email: "exec@argos.ai",
        role: "executive",
        firstName: "Avery",
        lastName: "Cross",
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
    });

    const result = await getCallHighlightManagementAccess(
      repository,
      "exec-1",
      "call-1",
      accessRepository as never,
    );

    expect(result).toEqual({
      ok: true,
      data: { canManage: false },
    });
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
