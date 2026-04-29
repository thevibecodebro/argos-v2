import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createManualCallUploadTarget = vi.fn();
const checkRateLimitForPolicy = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/calls/ingestion-service", () => ({
  createManualCallUploadTarget,
}));

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

describe("calls upload prepare route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createManualCallUploadTarget.mockReset();
    checkRateLimitForPolicy.mockReset();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      requestCount: 1,
      retryAfterSeconds: 3600,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "uploads:user:hash",
    });
  });

  it("returns a signed upload target for valid file metadata", async () => {
    createManualCallUploadTarget.mockResolvedValue({
      storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      token: "signed-token",
    });

    const route = await import("../app/api/calls/upload/prepare/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/calls/upload/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "demo.mp3",
          fileSizeBytes: 1024,
          contentType: "audio/mpeg",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      path: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      token: "signed-token",
    });
  });

  it("returns a structured 413 error for oversized upload metadata", async () => {
    const route = await import("../app/api/calls/upload/prepare/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/calls/upload/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "demo.mp3",
          fileSizeBytes: 501 * 1024 * 1024,
          contentType: "audio/mpeg",
        }),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: "file_too_large",
      retryable: true,
    });
    expect(createManualCallUploadTarget).not.toHaveBeenCalled();
  });

  it("returns 429 when the user upload limit is exceeded", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      limit: 20,
      remaining: 0,
      requestCount: 21,
      retryAfterSeconds: 87,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "uploads:user:hash",
    });

    const route = await import("../app/api/calls/upload/prepare/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/calls/upload/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "demo.mp3",
          fileSizeBytes: 1024,
          contentType: "audio/mpeg",
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("87");
    await expect(response.json()).resolves.toMatchObject({
      code: "rate_limit_exceeded",
      retryAfterSeconds: 87,
    });
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("uploadPrepare", {
      type: "user",
      id: "auth-user-1",
    });
    expect(createManualCallUploadTarget).not.toHaveBeenCalled();
  });
});
