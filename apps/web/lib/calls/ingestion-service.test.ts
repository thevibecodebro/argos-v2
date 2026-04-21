import { describe, expect, it, vi } from "vitest";
import {
  createManualCallUploadTarget,
  storeManualCallSource,
} from "./ingestion-service";

describe("storeManualCallSource", () => {
  it("uploads the source recording and returns the stored asset info", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://storage.example/recordings/call-1/source/demo.mp3" },
    });
    const from = vi.fn().mockReturnValue({
      upload,
      getPublicUrl,
    });

    const result = await storeManualCallSource(
      {
        callId: "call-1",
        bytes: Buffer.from("audio"),
        contentType: "audio/mpeg",
        fileName: "demo.mp3",
      },
      {
        supabase: {
          storage: {
            from,
          },
        } as any,
      },
    );

    expect(from).toHaveBeenCalledWith("call-recordings");
    expect(upload).toHaveBeenCalledWith(
      "recordings/call-1/source/demo.mp3",
      Buffer.from("audio"),
      {
        contentType: "audio/mpeg",
        upsert: true,
      },
    );
    expect(result).toEqual({
      storagePath: "recordings/call-1/source/demo.mp3",
      publicUrl: "https://storage.example/recordings/call-1/source/demo.mp3",
    });
  });

  it("throws a descriptive error when storage upload fails", async () => {
    const from = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: { message: "bucket unavailable" },
      }),
      getPublicUrl: vi.fn(),
    });

    await expect(
      storeManualCallSource(
        {
          callId: "call-1",
          bytes: Buffer.from("audio"),
          contentType: null,
          fileName: "demo.mp3",
        },
        {
          supabase: {
            storage: {
              from,
            },
          } as any,
        },
      ),
    ).rejects.toThrow("Failed to store source recording: bucket unavailable");
  });
});

describe("createManualCallUploadTarget", () => {
  it("creates a signed upload target scoped to the auth user", async () => {
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: { token: "signed-token" },
      error: null,
    });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://storage.example/recordings/manual-uploads/auth-user-1/upload-1/demo.mp3" },
    });
    const from = vi.fn().mockReturnValue({
      createSignedUploadUrl,
      getPublicUrl,
    });

    const result = await createManualCallUploadTarget(
      {
        authUserId: "auth-user-1",
        fileName: "demo.mp3",
      },
      {
        createId: () => "upload-1",
        supabase: {
          storage: {
            from,
          },
        } as any,
      },
    );

    expect(from).toHaveBeenCalledWith("call-recordings");
    expect(createSignedUploadUrl).toHaveBeenCalledWith(
      "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      { upsert: true },
    );
    expect(result).toEqual({
      storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      publicUrl:
        "https://storage.example/recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      token: "signed-token",
    });
  });

  it("throws a descriptive error when signed upload url creation fails", async () => {
    const from = vi.fn().mockReturnValue({
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "signing unavailable" },
      }),
      getPublicUrl: vi.fn(),
    });

    await expect(
      createManualCallUploadTarget(
        {
          authUserId: "auth-user-1",
          fileName: "demo.mp3",
        },
        {
          createId: () => "upload-1",
          supabase: {
            storage: {
              from,
            },
          } as any,
        },
      ),
    ).rejects.toThrow("Failed to create source upload target: signing unavailable");
  });
});
