import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createCallsRepository = vi.fn();
const completeUploadedCall = vi.fn();
const createSupabaseAdminClient = vi.fn();
const checkRateLimitForPolicy = vi.fn();

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
    createCallsRepository.mockReset();
    completeUploadedCall.mockReset();
    createSupabaseAdminClient.mockReset();
    checkRateLimitForPolicy.mockReset();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createCallsRepository.mockReturnValue({});
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
