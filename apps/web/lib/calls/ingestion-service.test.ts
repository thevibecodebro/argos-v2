import { describe, expect, it, vi } from "vitest";
import {
  createManualCallUploadTarget,
  storeManualCallSource,
} from "./ingestion-service";

describe("storeManualCallSource", () => {
  it("uploads the source recording and returns private storage metadata", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const bucket = {
      upload,
    };
    const from = vi.fn().mockReturnValue(bucket);

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
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/demo.mp3",
      contentType: "audio/mpeg",
      fileSizeBytes: 5,
    });
  });

  it("throws a descriptive error when storage upload fails", async () => {
    const from = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: { message: "bucket unavailable" },
      }),
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

  it("rejects path-like filenames before storing source recordings", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upload });

    await expect(
      storeManualCallSource(
        {
          callId: "call-1",
          bytes: Buffer.from("audio"),
          contentType: "audio/mpeg",
          fileName: "../demo.mp3",
        },
        {
          supabase: {
            storage: {
              from,
            },
          } as any,
        },
      ),
    ).rejects.toThrow("Invalid recording filename.");

    expect(upload).not.toHaveBeenCalled();
  });
});

describe("createManualCallUploadTarget", () => {
  it("creates a signed upload target scoped to the auth user", async () => {
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: { token: "signed-token" },
      error: null,
    });
    const bucket = {
      createSignedUploadUrl,
    };
    const from = vi.fn().mockReturnValue(bucket);

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
      { upsert: false },
    );
    expect(result).toEqual({
      storageBucket: "call-recordings",
      storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      token: "signed-token",
    });
  });

  it("throws a descriptive error when signed upload url creation fails", async () => {
    const from = vi.fn().mockReturnValue({
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "signing unavailable" },
      }),
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

  it("rejects path-like filenames before creating signed upload targets", async () => {
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: { token: "signed-token" },
      error: null,
    });
    const from = vi.fn().mockReturnValue({ createSignedUploadUrl });

    await expect(
      createManualCallUploadTarget(
        {
          authUserId: "auth-user-1",
          fileName: "nested/demo.mp3",
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
    ).rejects.toThrow("Invalid recording filename.");

    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });
});
