import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), retry: vi.fn(), repository: {} }));
vi.mock("@/lib/access/managed-capabilities-server", () => ({ requireAnyAuthenticatedManagedCapability: mocks.access }));
vi.mock("@/lib/calls/create-repository", () => ({ createCallsRepository: () => mocks.repository }));
vi.mock("@/lib/calls/service", () => ({ retryCallProcessingJob: mocks.retry, getCallStatus: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); mocks.retry.mockResolvedValue({ ok: true, data: { processingJob: { id: "job" } } }); });
it.each(["managed", "legacy"])("only passes verified retry entitlement for %s access", async (mode) => {
  mocks.access.mockResolvedValue({ ok: true, user: { id: "user" }, orgId: "org-A", access: { mode } });
  const { POST } = await import("../app/api/calls/[id]/status/route");
  const response = await POST(new Request("http://localhost/api/calls/call/status", { method: "POST" }), { params: Promise.resolve({ id: "call" }) });
  expect(response.status).toBe(200);
  expect(mocks.retry).toHaveBeenCalledWith(mocks.repository, "user", "call", undefined, { callUploadCapability: mode === "managed" ? { authUserId: "user", orgId: "org-A" } : undefined });
});
it("does not invoke retry when workspace capability is denied", async () => {
  mocks.access.mockResolvedValue({ ok: false, response: Response.json({ error: "Unavailable" }, { status: 403 }) });
  const { POST } = await import("../app/api/calls/[id]/status/route");
  expect((await POST(new Request("http://localhost/api/calls/call/status", { method: "POST" }), { params: Promise.resolve({ id: "call" }) })).status).toBe(403);
  expect(mocks.retry).not.toHaveBeenCalled();
});
