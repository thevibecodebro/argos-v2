import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createRubricsRepository = vi.fn();
const createUsersRepository = vi.fn();
const getActiveRubric = vi.fn();
const loadRubricHistory = vi.fn();
const getRubricById = vi.fn();
const createDraftRubric = vi.fn();
const publishRubric = vi.fn();
const validateRubricInput = vi.fn();
const parseCsvRubricImport = vi.fn();
const parseJsonRubricImport = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/rubrics/create-repository", () => ({
  createRubricsRepository,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/rubrics/service", () => ({
  getActiveRubric,
  loadRubricHistory,
  getRubricById,
  createDraftRubric,
  publishRubric,
  validateRubricInput,
}));

vi.mock("@/lib/rubrics/import", () => ({
  parseCsvRubricImport,
  parseJsonRubricImport,
}));

describe("rubrics routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createRubricsRepository.mockReset();
    createUsersRepository.mockReset();
    getActiveRubric.mockReset();
    loadRubricHistory.mockReset();
    getRubricById.mockReset();
    createDraftRubric.mockReset();
    publishRubric.mockReset();
    validateRubricInput.mockReset();
    parseCsvRubricImport.mockReset();
    parseJsonRubricImport.mockReset();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createRubricsRepository.mockReturnValue({ kind: "rubrics-repo" });
    createUsersRepository.mockReturnValue({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        id: "user-1",
        orgId: "org-1",
        role: "admin",
      }),
    });
    validateRubricInput.mockImplementation((input: unknown) => ({
      ok: true,
      data: input,
    }));
  });

  it("returns 401 for unauthorized rubric bootstrap requests", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue(null);

    const route = await import("../../app/api/rubrics/route");
    const response = await route.GET(new Request("http://localhost:3000/api/rubrics"));

    expect(response.status).toBe(401);
  });

  it("returns active rubric and history for admin bootstrap requests", async () => {
    getActiveRubric.mockResolvedValue({
      ok: true,
      data: { id: "rubric-2", name: "Revenue Scorecard v2" },
    });
    loadRubricHistory.mockResolvedValue([
      { id: "rubric-2", version: 2, name: "Revenue Scorecard v2", isActive: true },
      { id: "rubric-1", version: 1, name: "Revenue Scorecard v1", isActive: false },
    ]);

    const route = await import("../../app/api/rubrics/route");
    const response = await route.GET(new Request("http://localhost:3000/api/rubrics"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeRubric: { id: "rubric-2", name: "Revenue Scorecard v2" },
      history: [
        { id: "rubric-2", version: 2, name: "Revenue Scorecard v2", isActive: true },
        { id: "rubric-1", version: 1, name: "Revenue Scorecard v1", isActive: false },
      ],
    });
  });

  it("returns a specific historical rubric when rubricId is requested", async () => {
    getRubricById.mockResolvedValue({
      ok: true,
      data: { id: "rubric-4", version: 4, name: "Revenue Scorecard v4", categories: [] },
    });

    const route = await import("../../app/api/rubrics/route");
    const response = await route.GET(
      new Request("http://localhost:3000/api/rubrics?rubricId=rubric-4"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "rubric-4",
      version: 4,
      name: "Revenue Scorecard v4",
      categories: [],
    });
  });

  it("previews csv imports without creating a draft", async () => {
    parseCsvRubricImport.mockReturnValue({
      rubric: {
        name: "Imported CSV Rubric",
        description: null,
        categories: [{ slug: "rapport", name: "Build Rapport", description: "", weight: 5, scoringCriteria: { excellent: "", proficient: "", developing: "", lookFor: [] }, sortOrder: 0 }],
      },
      issues: [{ row: 3, field: "weight", message: "Weight must be positive" }],
    });

    const route = await import("../../app/api/rubrics/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview: true,
          sourceType: "csv_import",
          fileName: "rubric.csv",
          content: "name,slug,weight\nBuild Rapport,rapport,5",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      rubric: {
        name: "Imported CSV Rubric",
        description: null,
        categories: [{ slug: "rapport", name: "Build Rapport", description: "", weight: 5, scoringCriteria: { excellent: "", proficient: "", developing: "", lookFor: [] }, sortOrder: 0 }],
      },
      issues: [{ row: 3, field: "weight", message: "Weight must be positive" }],
    });
    expect(parseCsvRubricImport).toHaveBeenCalledWith(
      "name,slug,weight\nBuild Rapport,rapport,5",
      "rubric.csv",
    );
    expect(createDraftRubric).not.toHaveBeenCalled();
  });

  it("creates a draft only after the rubric payload validates", async () => {
    createDraftRubric.mockResolvedValue({
      id: "rubric-5",
      version: 5,
      name: "Revenue Scorecard v5",
      isActive: false,
      categories: [],
    });

    const route = await import("../../app/api/rubrics/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "manual",
          rubric: {
            name: "Revenue Scorecard v5",
            description: null,
            categories: [
              {
                slug: "rapport",
                name: "Build Rapport",
                description: "Create trust early",
                weight: 5,
                scoringCriteria: {
                  excellent: "Strong opener",
                  proficient: "Solid opener",
                  developing: "Weak opener",
                  lookFor: ["Relevant context"],
                },
              },
            ],
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(validateRubricInput).toHaveBeenCalled();
    expect(createDraftRubric).toHaveBeenCalledWith(
      { kind: "rubrics-repo" },
      {
        orgId: "org-1",
        createdBy: "auth-user-1",
        sourceType: "manual",
        rubric: {
          name: "Revenue Scorecard v5",
          description: null,
          categories: [
            {
              slug: "rapport",
              name: "Build Rapport",
              description: "Create trust early",
              weight: 5,
              scoringCriteria: {
                excellent: "Strong opener",
                proficient: "Solid opener",
                developing: "Weak opener",
                lookFor: ["Relevant context"],
              },
            },
          ],
        },
      },
    );
  });

  it("publishes a draft rubric through the publish route", async () => {
    publishRubric.mockResolvedValue({
      id: "rubric-5",
      version: 5,
      isActive: true,
      categories: [],
    });

    const route = await import("../../app/api/rubrics/[id]/publish/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/rubrics/rubric-5/publish", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "rubric-5" }) },
    );

    expect(response.status).toBe(200);
    expect(publishRubric).toHaveBeenCalledWith(
      { kind: "rubrics-repo" },
      {
        orgId: "org-1",
        rubricId: "rubric-5",
        publishedBy: "auth-user-1",
      },
    );
  });
});
