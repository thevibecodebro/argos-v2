import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createManualCallUploadTarget = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/calls/ingestion-service", () => ({
  createManualCallUploadTarget,
}));

describe("calls upload prepare route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createManualCallUploadTarget.mockReset();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
  });

  it("returns a signed upload target for valid file metadata", async () => {
    createManualCallUploadTarget.mockResolvedValue({
      storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      publicUrl: "https://storage.example/manual/demo.mp3",
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
});
