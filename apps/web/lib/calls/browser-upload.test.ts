import { describe, expect, it, vi } from "vitest";
import { uploadCallFromBrowser } from "./browser-upload";

describe("uploadCallFromBrowser", () => {
  it("prepares the upload, sends the file to storage, and completes queueing", async () => {
    const uploadResumable = vi.fn().mockImplementation(async (input) => {
      input.onProgress(50);
      input.onProgress(100);
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            path: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
            token: "signed-token",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "call-1",
            status: "uploaded",
            createdAt: "2026-04-21T00:00:00.000Z",
          }),
          { status: 200 },
        ),
      );
    const progressValues: number[] = [];

    const result = await uploadCallFromBrowser(
      {
        callTopic: "Discovery",
        file: new File(["audio"], "demo.mp3", { type: "audio/mpeg" }),
      },
      {
        fetchImpl: fetchImpl as typeof fetch,
        onProgress: (progress) => progressValues.push(progress),
        uploadResumable,
      },
    );

    expect(result.id).toBe("call-1");
    expect(uploadResumable).toHaveBeenCalledWith({
      file: expect.any(File),
      onProgress: expect.any(Function),
      path: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
      token: "signed-token",
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/api/calls/upload/prepare",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/api/calls/upload/complete",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(progressValues).toEqual([15, 35, 60, 85, 100]);
  });

  it("surfaces plain-text upstream errors instead of throwing a JSON parse error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("Request Entity Too Large", { status: 413 }),
    );

    await expect(
      uploadCallFromBrowser(
        {
          callTopic: "Discovery",
          file: new File(["audio"], "demo.mp3", { type: "audio/mpeg" }),
        },
        {
          fetchImpl: fetchImpl as typeof fetch,
          uploadResumable: vi.fn(),
        },
      ),
    ).rejects.toThrow("Request Entity Too Large");
  });
});
