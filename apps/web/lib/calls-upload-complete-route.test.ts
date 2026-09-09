import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const requireAuthenticatedManagedCapability = vi.fn();
const createCallsRepository = vi.fn();
const completeUploadedCall = vi.fn();
const findCompletedManualUpload = vi.fn();
const getManualCallUploadTargetStatus = vi.fn();
const consumeManualCallUploadTarget = vi.fn();
const createSupabaseAdminClient = vi.fn();
const checkRateLimitForPolicy = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/access/managed-capabilities-server", () => ({
  requireAuthenticatedManagedCapability,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository,
}));

vi.mock("@/lib/calls/ingestion-service", () => ({
  consumeManualCallUploadTarget,
  getManualCallUploadTargetStatus,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

vi.mock("@/lib/calls/service", async () => {
  const actual = await vi.importActual<typeof import("./calls/service")>("./calls/service");
  return {
    ...actual,
    completeUploadedCall,
    findCompletedManualUpload,
  };
});

vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy,
  rateLimitExceededResponse: (result: { retryAfterSeconds: number }) =>
    Response.json(
      {
        code: "rate_limit_exceeded",
        error: "Too many requests. Try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    ),
}));

describe("calls upload complete route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    requireAuthenticatedManagedCapability.mockReset();
    createCallsRepository.mockReset();
    completeUploadedCall.mockReset();
    findCompletedManualUpload.mockReset().mockResolvedValue(null);
    getManualCallUploadTargetStatus.mockReset().mockResolvedValue("valid");
    consumeManualCallUploadTarget.mockReset();
    createSupabaseAdminClient.mockReset();
    checkRateLimitForPolicy.mockReset();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    requireAuthenticatedManagedCapability.mockImplementation(async () => {
      const user = await getAuthenticatedSupabaseUser();
      return user
        ? { ok: true, user, orgId: "org-1", access: { mode: "legacy" } }
        : { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
    });
    createCallsRepository.mockReturnValue({});
    consumeManualCallUploadTarget.mockResolvedValue(undefined);
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      requestCount: 1,
      retryAfterSeconds: 3600,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "uploads:user:hash",
    });
    createSupabaseAdminClient.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          info: vi.fn().mockResolvedValue({
            data: {
              size: 1024,
              contentType: "audio/mpeg",
            },
            error: null,
          }),
        }),
      },
    });
  });

  it("rejects a target prepared for a different workspace before storage or queueing", async () => {
    getManualCallUploadTargetStatus.mockResolvedValue("workspace_mismatch");
    const { POST } = await import("../app/api/calls/upload/complete/route");
    const response = await POST(new Request("http://localhost/api/calls/upload/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "demo.mp3", fileSizeBytes: 1024, contentType: "audio/mpeg", consentConfirmed: true, storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3" }),
    }));
    expect(response.status).toBe(400);
    expect(getManualCallUploadTargetStatus).toHaveBeenCalledWith({ authUserId: "auth-user-1", orgId: "org-1", storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3" });
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
    expect(completeUploadedCall).not.toHaveBeenCalled();
    expect(consumeManualCallUploadTarget).not.toHaveBeenCalled();
  });

  it("allows renewal after expired metadata cleanup only with the original workspace binding", async () => {
    getManualCallUploadTargetStatus.mockResolvedValue("missing");
    const { POST } = await import("../app/api/calls/upload/complete/route");
    for (const orgId of [undefined, "org-1", "other-org"]) {
      const response = await POST(new Request("http://localhost/api/calls/upload/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, fileName: "demo.mp3", fileSizeBytes: 1024, contentType: "audio/mpeg", consentConfirmed: true, storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3" }),
      }));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: orgId === "org-1" ? "upload_target_expired" : "invalid_upload" });
    }
    expect(completeUploadedCall).not.toHaveBeenCalled();
  });

  it("reports definitive expiry without queueing a call", async () => {
    getManualCallUploadTargetStatus.mockResolvedValue("expired");
    const { POST } = await import("../app/api/calls/upload/complete/route");
    const response = await POST(new Request("http://localhost/api/calls/upload/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "demo.mp3", fileSizeBytes: 1024, contentType: "audio/mpeg", consentConfirmed: true, storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3" }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "upload_target_expired" });
    expect(completeUploadedCall).not.toHaveBeenCalled();
    expect(consumeManualCallUploadTarget).not.toHaveBeenCalled();
  });

  it.each(["expired", "missing"])("returns the existing owned call before classifying a target as %s", async (status) => {
    findCompletedManualUpload.mockResolvedValue({ ok: true, data: { id: "original-call", status: "uploaded", createdAt: "2026-09-09T00:00:00Z" } });
    getManualCallUploadTargetStatus.mockResolvedValue(status);
    const { POST } = await import("../app/api/calls/upload/complete/route");
    const response = await POST(new Request("http://localhost/api/calls/upload/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "demo.mp3", fileSizeBytes: 1024, contentType: "audio/mpeg", consentConfirmed: true, storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "original-call" });
    expect(getManualCallUploadTargetStatus).not.toHaveBeenCalled();
    expect(completeUploadedCall).not.toHaveBeenCalled();
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it(
    "queues a call after a direct storage upload completes",
    async () => {
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
      expect(checkRateLimitForPolicy).toHaveBeenCalledWith("uploadComplete", {
        type: "user",
        id: "auth-user-1",
      });
      expect(completeUploadedCall).toHaveBeenCalledWith(
        {},
        "auth-user-1",
        expect.objectContaining({
          fileName: "demo.mp3",
          sourceAsset: expect.objectContaining({
            storageBucket: "call-recordings",
            storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
            contentType: "audio/mpeg",
            fileSizeBytes: 1024,
          }),
        }),
        {
          callUploadCapability: {
            authUserId: "auth-user-1",
            orgId: "org-1",
          },
        },
      );
      expect(consumeManualCallUploadTarget).toHaveBeenCalledWith({
        authUserId: "auth-user-1",
        storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      });
      await expect(response.json()).resolves.toMatchObject({ id: "call-1" });
    },
    10_000,
  );

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

  it("rejects completion when the uploaded storage object is missing", async () => {
    createSupabaseAdminClient.mockReturnValueOnce({
      storage: {
        from: vi.fn().mockReturnValue({
          info: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Object not found" },
          }),
        }),
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

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_upload",
      error: "The uploaded recording could not be verified.",
      retryable: true,
      details: { reason: "Object not found" },
    });
    expect(completeUploadedCall).not.toHaveBeenCalled();
  });

  it("rejects completion when verified storage metadata does not match the upload payload", async () => {
    createSupabaseAdminClient.mockReturnValueOnce({
      storage: {
        from: vi.fn().mockReturnValue({
          info: vi.fn().mockResolvedValue({
            data: {
              size: 512,
              contentType: "audio/wav",
            },
            error: null,
          }),
        }),
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

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_upload",
      error: "The uploaded recording could not be verified.",
      retryable: true,
      details: {
        expectedSizeBytes: 1024,
        actualSizeBytes: 512,
        expectedContentType: "audio/mpeg",
        actualContentType: "audio/wav",
      },
    });
    expect(completeUploadedCall).not.toHaveBeenCalled();
  });

  it("rejects completion when storage object metadata is missing size", async () => {
    createSupabaseAdminClient.mockReturnValueOnce({
      storage: {
        from: vi.fn().mockReturnValue({
          info: vi.fn().mockResolvedValue({
            data: {
              contentType: "audio/mpeg",
            },
            error: null,
          }),
        }),
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

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_upload",
      error: "The uploaded recording could not be verified.",
      retryable: true,
      details: { reason: "Storage object size metadata is missing" },
    });
    expect(completeUploadedCall).not.toHaveBeenCalled();
  });

  it("rejects completion when requested content type is missing from storage metadata", async () => {
    createSupabaseAdminClient.mockReturnValueOnce({
      storage: {
        from: vi.fn().mockReturnValue({
          info: vi.fn().mockResolvedValue({
            data: {
              size: 1024,
            },
            error: null,
          }),
        }),
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

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_upload",
      error: "The uploaded recording could not be verified.",
      retryable: true,
      details: { reason: "Storage object content type metadata is missing" },
    });
    expect(completeUploadedCall).not.toHaveBeenCalled();
  });

  it("rejects completion when request content type is omitted and storage content type metadata is missing", async () => {
    createSupabaseAdminClient.mockReturnValueOnce({
      storage: {
        from: vi.fn().mockReturnValue({
          info: vi.fn().mockResolvedValue({
            data: {
              size: 1024,
              contentType: null,
            },
            error: null,
          }),
        }),
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
          callTopic: "Discovery",
          consentConfirmed: true,
          storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_upload",
      error: "The uploaded recording could not be verified.",
      retryable: true,
      details: { reason: "Storage object content type metadata is missing" },
    });
    expect(completeUploadedCall).not.toHaveBeenCalled();
  });
});
