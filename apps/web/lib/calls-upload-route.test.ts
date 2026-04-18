import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createCallsRepository = vi.fn();
const uploadCall = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository,
}));

vi.mock("@/lib/calls/service", () => ({
  uploadCall,
}));

describe("calls upload route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createCallsRepository.mockReset();
    uploadCall.mockReset();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createCallsRepository.mockReturnValue({});
  });

  it("returns a structured 415 error for unsupported files", async () => {
    const route = await import("../app/api/calls/upload/route");
    const form = new FormData();
    form.append("recording", new File(["hello"], "call.avi", { type: "video/x-msvideo" }));
    form.append("consentConfirmed", "true");

    const response = await route.POST(
      new Request("http://localhost:3000/api/calls/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({
      code: "unsupported_file_type",
      error: "This recording format is not supported.",
      retryable: true,
    });
    expect(uploadCall).not.toHaveBeenCalled();
  });

  it("returns a structured 413 error for oversized files", async () => {
    const route = await import("../app/api/calls/upload/route");
    const file = new File(["large"], "call.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", {
      configurable: true,
      value: 501 * 1024 * 1024,
    });
    const form = new FormData();
    form.append("recording", file);
    form.append("consentConfirmed", "true");
    const response = await route.POST({
      formData: vi.fn().mockResolvedValue(form),
    } as unknown as Request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: "file_too_large",
      retryable: true,
      details: {
        maxBytes: 500 * 1024 * 1024,
      },
    });
    expect(uploadCall).not.toHaveBeenCalled();
  });

  it("maps processing exceptions to a structured 500 error", async () => {
    uploadCall.mockRejectedValue(new Error("transcriber unavailable"));

    const route = await import("../app/api/calls/upload/route");
    const form = new FormData();
    form.append("recording", new File(["hello"], "call.mp3", { type: "audio/mpeg" }));
    form.append("consentConfirmed", "true");

    const response = await route.POST(
      new Request("http://localhost:3000/api/calls/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "processing_failed",
      error: "The call upload could not be queued for processing.",
      retryable: true,
      details: {
        reason: "transcriber unavailable",
      },
    });
  });

  it("passes the uploaded file bytes and mime type to the calls service", async () => {
    uploadCall.mockResolvedValue({
      ok: true,
      data: {
        id: "call-1",
        status: "uploaded",
        createdAt: "2026-04-17T00:00:00.000Z",
      },
    });

    const route = await import("../app/api/calls/upload/route");
    const form = new FormData();
    form.append("recording", new File(["audio-bytes"], "call.mp3", { type: "audio/mpeg" }));
    form.append("consentConfirmed", "true");
    form.append("callTopic", "Discovery call");

    const response = await route.POST(
      new Request("http://localhost:3000/api/calls/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(200);
    expect(uploadCall).toHaveBeenCalledWith(
      {},
      "auth-user-1",
      expect.objectContaining({
        fileName: "call.mp3",
        fileSizeBytes: 11,
        callTopic: "Discovery call",
        recording: {
          bytes: expect.any(Uint8Array),
          contentType: "audio/mpeg",
        },
      }),
    );
  });
});
