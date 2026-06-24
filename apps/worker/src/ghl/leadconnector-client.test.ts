import { describe, expect, it, vi } from "vitest";
import { createLeadConnectorClient } from "../../../../packages/ghl-client/src/index";

describe("createLeadConnectorClient", () => {
  it("rejects oversized recording downloads before buffering the provider body", async () => {
    const readBody = vi.fn().mockResolvedValue(new ArrayBuffer(0));
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: {},
      headers: new Headers({
        "Content-Length": "5",
        "Content-Type": "audio/x-wav",
      }),
      arrayBuffer: readBody,
    } as unknown as Response);

    const client = createLeadConnectorClient({
      accessToken: "ghl-access-token",
      fetcher,
      maxRecordingBytes: 4,
    });

    await expect(
      client.downloadMessageRecording({
        locationId: "location-1",
        messageId: "message-1",
      }),
    ).rejects.toThrow("Response body exceeds 4 bytes");

    expect(readBody).not.toHaveBeenCalled();
  });

  it("rejects streaming recording bodies once the configured byte limit is exceeded", async () => {
    const readBody = vi.fn().mockResolvedValue(new ArrayBuffer(0));
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.enqueue(new Uint8Array([4, 5]));
          controller.close();
        },
      }),
      headers: new Headers({
        "Content-Type": "audio/x-wav",
      }),
      arrayBuffer: readBody,
    } as unknown as Response);

    const client = createLeadConnectorClient({
      accessToken: "ghl-access-token",
      fetcher,
      maxRecordingBytes: 4,
    });

    await expect(
      client.downloadMessageRecording({
        locationId: "location-1",
        messageId: "message-1",
      }),
    ).rejects.toThrow("Response body exceeds 4 bytes");

    expect(readBody).not.toHaveBeenCalled();
  });
});
