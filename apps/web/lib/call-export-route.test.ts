import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createCallsRepository = vi.fn();
const exportCallData = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository,
}));

vi.mock("@/lib/calls/service", () => ({
  exportCallData,
}));

describe("call export route", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthenticatedSupabaseUser.mockReset();
    createCallsRepository.mockReset();
    exportCallData.mockReset();
    createCallsRepository.mockReturnValue({ calls: true });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "admin-1" });
    exportCallData.mockResolvedValue({
      ok: true,
      data: {
        annotations: [],
        call: {
          id: "call-1",
          status: "complete",
        },
        exportedAt: "2026-05-11T21:00:00.000Z",
        recording: null,
      },
    });
  });

  it("returns a no-store JSON attachment for exported call data", async () => {
    const route = await import("../app/api/calls/[id]/export/route");
    const response = await route.GET(
      new Request("http://localhost:3100/api/calls/call-1/export"),
      { params: Promise.resolve({ id: "call-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toContain("argos-call-call-1.json");
    await expect(response.json()).resolves.toMatchObject({
      call: { id: "call-1" },
      exportedAt: "2026-05-11T21:00:00.000Z",
    });
    expect(exportCallData).toHaveBeenCalledWith({ calls: true }, "admin-1", "call-1");
  });

  it("returns service errors without leaking internals", async () => {
    exportCallData.mockResolvedValueOnce({
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Only admins can export call data",
    });

    const route = await import("../app/api/calls/[id]/export/route");
    const response = await route.GET(
      new Request("http://localhost:3100/api/calls/call-1/export"),
      { params: Promise.resolve({ id: "call-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: "forbidden",
      error: "Only admins can export call data",
    });
  });
});

