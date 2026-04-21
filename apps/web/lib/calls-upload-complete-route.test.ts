import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createCallsRepository = vi.fn();
const completeUploadedCall = vi.fn();
const createSupabaseAdminClient = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

vi.mock("@/lib/calls/service", async () => {
  const actual = await vi.importActual<typeof import("./calls/service")>("./calls/service");
  return {
    ...actual,
    completeUploadedCall,
  };
});

describe("calls upload complete route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createCallsRepository.mockReset();
    completeUploadedCall.mockReset();
    createSupabaseAdminClient.mockReset();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createCallsRepository.mockReturnValue({});
    createSupabaseAdminClient.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          getPublicUrl: vi.fn().mockReturnValue({
            data: {
              publicUrl: "https://storage.example/manual/demo.mp3",
            },
          }),
        }),
      },
    });
  });

  it("queues a call after a direct storage upload completes", async () => {
    completeUploadedCall.mockResolvedValue({
      ok: true,
      data: {
        id: "call-1",
        status: "uploaded",
        createdAt: "2026-04-21T00:00:00.000Z",
      },
    });

    const route = await import("../app/api/calls/upload/complete/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/calls/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "demo.mp3",
          fileSizeBytes: 1024,
          contentType: "audio/mpeg",
          callTopic: "Discovery",
          consentConfirmed: true,
          storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(completeUploadedCall).toHaveBeenCalledWith(
      {},
      "auth-user-1",
      expect.objectContaining({
        fileName: "demo.mp3",
        sourceAsset: expect.objectContaining({
          storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
        }),
      }),
    );
    await expect(response.json()).resolves.toMatchObject({ id: "call-1" });
  });

  it("rejects storage paths outside the authenticated user's upload scope", async () => {
    const route = await import("../app/api/calls/upload/complete/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/calls/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "demo.mp3",
          fileSizeBytes: 1024,
          contentType: "audio/mpeg",
          callTopic: "Discovery",
          consentConfirmed: true,
          storagePath: "recordings/manual-uploads/another-user/upload-1/demo.mp3",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_upload",
      retryable: true,
    });
    expect(completeUploadedCall).not.toHaveBeenCalled();
  });
});
