import { describe, expect, it, vi } from "vitest";
import { deleteAnnotation, getCallDetail, type CallsRepository } from "./service";

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
      error: "Only the annotation author or a manager can delete this note",
    });
    expect(repository.deleteAnnotation).not.toHaveBeenCalled();
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
