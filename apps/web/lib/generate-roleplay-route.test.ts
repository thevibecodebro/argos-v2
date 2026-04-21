import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createCallsRepository = vi.fn();
const getCallDetail = vi.fn();
const createRoleplayRepository = vi.fn();
const createRubricsRepository = vi.fn();
const loadActiveRubric = vi.fn();
const buildGeneratedRoleplayPreview = vi.fn();
const createGeneratedRoleplaySession = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository,
}));

vi.mock("@/lib/calls/service", () => ({
  getCallDetail,
}));

vi.mock("@/lib/roleplay/create-repository", () => ({
  createRoleplayRepository,
}));

vi.mock("@/lib/rubrics/create-repository", () => ({
  createRubricsRepository,
}));

vi.mock("@/lib/rubrics/service", () => ({
  loadActiveRubric,
}));

vi.mock("@/lib/roleplay/generate-from-call", () => ({
  buildGeneratedRoleplayPreview,
  createGeneratedRoleplaySession,
}));

describe("generate roleplay route", () => {
  const roleplayRepository = {
    findCurrentUserByAuthId: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createCallsRepository.mockReturnValue({});
    createRoleplayRepository.mockReturnValue(roleplayRepository);
    createRubricsRepository.mockReturnValue({});
    roleplayRepository.findCurrentUserByAuthId.mockResolvedValue({
      id: "rep-1",
      org: { id: "org-1" },
    });
    getCallDetail.mockResolvedValue({
      ok: true,
      data: {
        id: "call-22",
        status: "complete",
        categoryScores: [],
        moments: [],
        callStageReached: "discovery",
        overallScore: 71,
      },
    });
    loadActiveRubric.mockResolvedValue({ id: "rubric-active", categories: [] });
  });

  it("returns a preview payload on GET", async () => {
    buildGeneratedRoleplayPreview.mockReturnValue({
      defaultFocusSlug: "all",
      focusOptions: [{ slug: "all", label: "All" }],
      scenarioSummary: "An anonymized buyer wants a firmer next step.",
      scenarioBrief: "Derived from a real call.",
    });

    const route = await import("../app/api/calls/[id]/generate-roleplay/route");
    const response = await route.GET(
      new Request("http://localhost:3100/api/calls/call-22/generate-roleplay"),
      { params: Promise.resolve({ id: "call-22" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      defaultFocusSlug: "all",
      scenarioSummary: "An anonymized buyer wants a firmer next step.",
    });
  });

  it("creates a generated roleplay session on POST", async () => {
    createGeneratedRoleplaySession.mockResolvedValue({
      ok: true,
      data: { id: "session-generated-2" },
    });

    const route = await import("../app/api/calls/[id]/generate-roleplay/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/calls/call-22/generate-roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusCategorySlug: "all" }),
      }),
      { params: Promise.resolve({ id: "call-22" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({ id: "session-generated-2" });
    expect(createGeneratedRoleplaySession).toHaveBeenCalledWith(
      roleplayRepository,
      "auth-user-1",
      expect.objectContaining({
        focusCategorySlug: null,
      }),
    );
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue(null);

    const route = await import("../app/api/calls/[id]/generate-roleplay/route");
    const response = await route.GET(
      new Request("http://localhost:3100/api/calls/call-22/generate-roleplay"),
      { params: Promise.resolve({ id: "call-22" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Unauthorized" });
  });
});
