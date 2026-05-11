import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createCallsRepository = vi.fn();
const deleteCallData = vi.fn();
const getCallDetail = vi.fn();
const renameCall = vi.fn();
const remove = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository,
}));

vi.mock("@/lib/calls/service", () => ({
  deleteCallData,
  getCallDetail,
  renameCall,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        remove,
      }),
    },
  }),
}));

describe("call delete route", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthenticatedSupabaseUser.mockReset();
    createCallsRepository.mockReset();
    deleteCallData.mockReset();
    getCallDetail.mockReset();
    renameCall.mockReset();
    remove.mockReset();
    createCallsRepository.mockReturnValue({ calls: true });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "admin-1" });
    deleteCallData.mockResolvedValue({
      ok: true,
      data: {
        deletedStorageObjects: 1,
        success: true,
      },
    });
  });

  it("deletes call lifecycle data through the service", async () => {
    const route = await import("../app/api/calls/[id]/route");
    const response = await route.DELETE(
      new Request("http://localhost:3100/api/calls/call-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "call-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deletedStorageObjects: 1,
      success: true,
    });
    expect(deleteCallData).toHaveBeenCalledWith(
      { calls: true },
      "admin-1",
      "call-1",
      expect.objectContaining({
        removeStorageObjects: expect.any(Function),
      }),
    );
  });

  it("returns generic errors if deletion throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    deleteCallData.mockRejectedValueOnce(new Error("database password leaked"));

    const route = await import("../app/api/calls/[id]/route");
    const response = await route.DELETE(
      new Request("http://localhost:3100/api/calls/call-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "call-1" }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
