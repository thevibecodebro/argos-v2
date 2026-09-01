import { describe, expect, it, vi } from "vitest";
import {
  buildResumableUploadEndpoint,
  uploadToSignedResumableUrl,
} from "./resumable-upload";

describe("buildResumableUploadEndpoint", () => {
  it("uses the direct Supabase Storage hostname for large uploads", () => {
    expect(buildResumableUploadEndpoint("https://project-ref.supabase.co")).toBe(
      "https://project-ref.storage.supabase.co/storage/v1/upload/resumable",
    );
  });

  it("keeps local Supabase URLs on their configured origin", () => {
    expect(buildResumableUploadEndpoint("http://127.0.0.1:54321")).toBe(
      "http://127.0.0.1:54321/storage/v1/upload/resumable",
    );
  });
});

describe("uploadToSignedResumableUrl", () => {
  it("uses signed 6 MB TUS chunks and reports upload progress", async () => {
    let capturedOptions: Record<string, unknown> | undefined;
    const start = vi.fn();
    const createUpload = vi.fn((_file, options) => {
      capturedOptions = options;
      return { start };
    });
    const onProgress = vi.fn();

    const promise = uploadToSignedResumableUrl(
      {
        file: new File(["video"], "demo.mp4", { type: "video/mp4" }),
        onProgress,
        path: "recordings/manual-uploads/user-1/upload-1/demo.mp4",
        token: "signed-token",
      },
      {
        createUpload: createUpload as never,
        supabaseUrl: "https://project-ref.supabase.co",
      },
    );

    expect(start).toHaveBeenCalledOnce();
    expect(capturedOptions).toMatchObject({
      chunkSize: 6 * 1024 * 1024,
      endpoint: "https://project-ref.storage.supabase.co/storage/v1/upload/resumable",
      headers: { "x-signature": "signed-token" },
      metadata: {
        bucketName: "call-recordings",
        cacheControl: "3600",
        contentType: "video/mp4",
        objectName: "recordings/manual-uploads/user-1/upload-1/demo.mp4",
      },
      removeFingerprintOnSuccess: true,
      storeFingerprintForResuming: false,
      uploadDataDuringCreation: true,
    });

    (capturedOptions?.onProgress as (sent: number, total: number) => void)(5, 10);
    expect(onProgress).toHaveBeenCalledWith(50);

    (capturedOptions?.onSuccess as () => void)();
    await expect(promise).resolves.toBeUndefined();
  });
});
