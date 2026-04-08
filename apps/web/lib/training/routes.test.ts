import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createTrainingRepository = vi.fn();
const createTrainingModule = vi.fn();
const updateTrainingModule = vi.fn();
const getTrainingAiStatus = vi.fn();
const assignTrainingModule = vi.fn();
const unassignTrainingModule = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/training/create-repository", () => ({
  createTrainingRepository,
}));

vi.mock("@/lib/training/service", () => ({
  createTrainingModule,
  updateTrainingModule,
  getTrainingAiStatus,
  assignTrainingModule,
  unassignTrainingModule,
}));

describe("training routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createTrainingRepository.mockReset();
    createTrainingModule.mockReset();
    updateTrainingModule.mockReset();
    getTrainingAiStatus.mockReset();
    assignTrainingModule.mockReset();
    unassignTrainingModule.mockReset();
    createTrainingRepository.mockReturnValue({});
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    getTrainingAiStatus.mockReturnValue({ available: true, reason: null });
  });

  it("returns 401 for unauthorized module creation", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue(null);

    const route = await import("../../app/api/training/modules/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/training/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New module",
          skillCategory: "Discovery",
          description: "Desc",
          videoUrl: null,
          quizData: null,
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("validates the module creation body", async () => {
    const route = await import("../../app/api/training/modules/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/training/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New module" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("title"),
    });
    expect(createTrainingModule).not.toHaveBeenCalled();
  });

  it("validates the module patch body", async () => {
    const route = await import("../../app/api/training/modules/[id]/route");
    const response = await route.PATCH(
      new Request("http://localhost:3100/api/training/modules/module-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: 123 }),
      }),
      { params: Promise.resolve({ id: "module-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("title"),
    });
    expect(updateTrainingModule).not.toHaveBeenCalled();
  });

  it("returns the AI availability payload", async () => {
    getTrainingAiStatus.mockReturnValueOnce({ available: false, reason: "OPENAI_API_KEY is missing" });

    const route = await import("../../app/api/training/ai-status/route");
    const response = await route.GET(new Request("http://localhost:3100/api/training/ai-status"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ available: false });
  });

  it("returns 422 when training generation is unavailable", async () => {
    getTrainingAiStatus.mockReturnValueOnce({ available: false, reason: "OPENAI_API_KEY is missing" });

    const route = await import("../../app/api/training/modules/generate/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/training/modules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "Discovery" }),
      }),
    );

    expect(response.status).toBe(422);
    expect(createTrainingModule).not.toHaveBeenCalled();
    expect(updateTrainingModule).not.toHaveBeenCalled();
  });

  it("rejects invalid repIds during assignment", async () => {
    const route = await import("../../app/api/training/modules/[id]/assign/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/training/modules/module-1/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repIds: ["rep-1", ""] }),
      }),
      { params: Promise.resolve({ id: "module-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("repIds"),
    });
    expect(assignTrainingModule).not.toHaveBeenCalled();
  });

  it("calls unassign with the module and rep path params", async () => {
    unassignTrainingModule.mockResolvedValue({
      ok: true,
      data: { unassignedRepId: "rep-2" },
    });

    const route = await import("../../app/api/training/modules/[id]/assign/[repId]/route");
    const response = await route.DELETE(
      new Request("http://localhost:3100/api/training/modules/module-1/assign/rep-2", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "module-1", repId: "rep-2" }) },
    );

    expect(unassignTrainingModule).toHaveBeenCalledWith(
      expect.anything(),
      "auth-user-1",
      "module-1",
      "rep-2",
    );
    expect(response.status).toBe(200);
  });
});
