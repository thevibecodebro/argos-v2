import { describe, expect, it, vi } from "vitest";
import { downloadSourceAsset, storeCallSourceAsset } from "./storage";

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
    const readBody = vi.fn().mockResolvedValue(new ArrayBuffer(11));
    const download = vi.fn().mockResolvedValue({
      data: {
        size: 11,
        arrayBuffer: readBody,
      },
      error: null,
    });
    const from = vi.fn().mockReturnValue({ download });
    const writeFile = vi.fn().mockResolvedValue(undefined);

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
          writeFile: writeFile as any,
        },
      ),
    ).rejects.toThrow("Stored source asset changed after upload completion.");

    expect(readBody).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects oversized stored source assets before buffering the blob", async () => {
    const readBody = vi.fn().mockResolvedValue(new ArrayBuffer(0));
    const download = vi.fn().mockResolvedValue({
      data: {
        size: 11,
        arrayBuffer: readBody,
      },
      error: null,
    });
    const from = vi.fn().mockReturnValue({ download });
    const writeFile = vi.fn().mockResolvedValue(undefined);

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
          writeFile: writeFile as any,
        },
      ),
    ).rejects.toThrow("Response body exceeds 10 bytes");

    expect(readBody).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });
});
