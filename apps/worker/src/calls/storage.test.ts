import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  downloadSourceAsset,
  storeCallSourceAsset,
  streamResponseBodyToFile,
} from "./storage";

describe("storeCallSourceAsset", () => {
  it("rejects path-like filenames before worker storage upload", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upload });

    await expect(
      storeCallSourceAsset(
        {
          callId: "call-1",
          bytes: Buffer.from("audio"),
          contentType: "audio/mpeg",
          fileName: "..\\demo.mp3",
        },
        {
          env: {
            supabaseServiceRoleKey: "service-role",
            supabaseUrl: "https://supabase.local",
          } as any,
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

describe("downloadSourceAsset", () => {
  it("rejects stored source assets whose current size no longer matches the queued size", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.local/signed-source" },
      error: null,
    });
    const from = vi.fn().mockReturnValue({ createSignedUrl });
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("hello world", { headers: { "Content-Length": "11" } }),
    );

    await expect(
      downloadSourceAsset(
        {
          expectedSizeBytes: 10,
          storagePath: "recordings/call-1/source/demo.wav",
          targetPath: "/tmp/argos-v2-demo.wav",
        },
        {
          env: {
            maxSourceBytes: 500,
            supabaseServiceRoleKey: "service-role",
            supabaseUrl: "https://supabase.local",
          } as any,
          supabase: {
            storage: {
              from,
            },
          } as any,
          fetchImpl: fetchImpl as typeof fetch,
        },
      ),
    ).rejects.toThrow("Stored source asset changed after upload completion.");

    expect(createSignedUrl).toHaveBeenCalledWith(
      "recordings/call-1/source/demo.wav",
      60 * 60,
    );
  });

  it("rejects oversized stored source assets before streaming the response", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.local/signed-source" },
      error: null,
    });
    const from = vi.fn().mockReturnValue({ createSignedUrl });
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("hello world", { headers: { "Content-Length": "11" } }),
    );

    await expect(
      downloadSourceAsset(
        {
          storagePath: "recordings/call-1/source/demo.wav",
          targetPath: "/tmp/argos-v2-demo.wav",
        },
        {
          env: {
            maxSourceBytes: 10,
            supabaseServiceRoleKey: "service-role",
            supabaseUrl: "https://supabase.local",
          } as any,
          supabase: {
            storage: {
              from,
            },
          } as any,
          fetchImpl: fetchImpl as typeof fetch,
        },
      ),
    ).rejects.toThrow("Response body exceeds 10 bytes");
  });
});

describe("streamResponseBodyToFile", () => {
  it("streams a source asset to disk without buffering the entire recording", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "argos-storage-test-"));
    const targetPath = join(tempDir, "source.mp4");

    try {
      const receivedBytes = await streamResponseBodyToFile(
        new Response("streamed-video"),
        targetPath,
        100,
      );

      expect(receivedBytes).toBe(14);
      await expect(readFile(targetPath, "utf8")).resolves.toBe("streamed-video");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
