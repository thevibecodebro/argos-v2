import { describe, expect, it, vi } from "vitest";
import {
  consumeManualCallUploadTarget,
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
  it("creates an upload target scoped to the auth user", async () => {
    const lt = vi.fn().mockResolvedValue({ error: null });
    const deleteExpired = vi.fn().mockReturnValue({ lt });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ delete: deleteExpired, insert });

    const result = await createManualCallUploadTarget(
      {
        authUserId: "auth-user-1",
        fileName: "demo.mp3",
      },
      {
        createId: () => "upload-1",
        now: () => new Date("2026-09-08T00:00:00.000Z"),
        supabase: { from } as any,
      },
    );

    expect(from).toHaveBeenCalledWith("manual_recording_upload_targets");
    expect(lt).toHaveBeenCalledWith("expires_at", "2026-09-08T00:00:00.000Z");
    expect(insert).toHaveBeenCalledWith({
      auth_user_id: "auth-user-1",
      expires_at: "2026-09-09T00:00:00.000Z",
      storage_path: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
    });
    expect(result).toEqual({
      storageBucket: "call-recordings",
      storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
    });
  });

  it("rejects path-like filenames before creating upload targets", async () => {
    await expect(
      createManualCallUploadTarget(
        {
          authUserId: "auth-user-1",
          fileName: "nested/demo.mp3",
        },
        {
          createId: () => "upload-1",
        },
      ),
    ).rejects.toThrow("Invalid recording filename.");
  });

  it("fails closed when the exact upload target cannot be persisted", async () => {
    const lt = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({ lt }),
      insert: vi.fn().mockResolvedValue({ error: { message: "database unavailable" } }),
    });

    await expect(
      createManualCallUploadTarget(
        {
          authUserId: "auth-user-1",
          fileName: "demo.mp3",
        },
        {
          createId: () => "upload-1",
          now: () => new Date("2026-09-08T00:00:00.000Z"),
          supabase: { from } as any,
        },
      ),
    ).rejects.toThrow("Failed to create source upload target: database unavailable");
  });
});

describe("consumeManualCallUploadTarget", () => {
  it("deletes the exact user-scoped target", async () => {
    const finalEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn().mockReturnValue({ eq: finalEq });
    const from = vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: firstEq }),
    });

    await consumeManualCallUploadTarget(
      {
        authUserId: "auth-user-1",
        storagePath: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      },
      { supabase: { from } as any },
    );

    expect(firstEq).toHaveBeenCalledWith(
      "storage_path",
      "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
    );
    expect(finalEq).toHaveBeenCalledWith("auth_user_id", "auth-user-1");
  });
});
