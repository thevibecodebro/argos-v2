import { describe, expect, it, vi } from "vitest";
import { storeCallSourceAsset } from "./storage";

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
