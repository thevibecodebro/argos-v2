import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  processZoomWebhookRequest,
  type ZoomWebhookRepository,
} from "./zoom-webhook";

function createRepository(
  overrides: Partial<ZoomWebhookRepository> = {},
): ZoomWebhookRepository {
  return {
    createCall: vi.fn(),
    createOrResetCallProcessingJob: vi.fn(),
    findCallByZoomRecordingId: vi.fn(),
    findPreferredCallOwner: vi.fn(),
    findZoomIntegrationByAccountId: vi.fn(),
    updateCallRecording: vi.fn(),
    updateCallStatus: vi.fn(),
    updateZoomTokens: vi.fn(),
    ...overrides,
  };
}

function sign(secret: string, rawBody: string, timestamp = Math.floor(Date.now() / 1000).toString()) {
  const message = `v0:${timestamp}:${rawBody}`;
  const signature = `v0=${crypto.createHmac("sha256", secret).update(message).digest("hex")}`;
  return { signature, timestamp };
}

describe("processZoomWebhookRequest", () => {
  it("returns the Zoom endpoint validation challenge", async () => {
    const repository = createRepository();
    const rawBody = JSON.stringify({
      event: "endpoint.url_validation",
      payload: {
        plainToken: "plain-token",
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    const result = await processZoomWebhookRequest(repository, {
      headers: { signature, timestamp },
      rawBody,
      env: {
        ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
      },
    });

    expect(result).toEqual({
      status: 200,
      body: {
        plainToken: "plain-token",
        encryptedToken: crypto.createHmac("sha256", "webhook-secret").update("plain-token").digest("hex"),
      },
    });
  });

  it("rejects invalid webhook signatures", async () => {
    const repository = createRepository();

    const result = await processZoomWebhookRequest(repository, {
      headers: { signature: "v0=invalid", timestamp: Math.floor(Date.now() / 1000).toString() },
      rawBody: JSON.stringify({ event: "recording.completed" }),
      env: {
        ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
      },
    });

    expect(result).toEqual({
      status: 401,
      body: { error: "Invalid webhook signature" },
    });
  });

  it("stores the preferred Zoom asset and enqueues processing without scoring inline", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(Buffer.from("zoom-audio"), {
        status: 200,
        headers: {
          "Content-Type": "audio/mp4",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const storeSourceAsset = vi.fn().mockResolvedValue({
      storagePath: "recordings/call-1/source/recording-1.m4a",
      publicUrl: "https://storage.example/recordings/call-1/source/recording-1.m4a",
    });
    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
    });
    const rawBody = JSON.stringify({
      event: "recording.completed",
      payload: {
        account_id: "zoom-account-1",
        object: {
          id: "meeting-1",
          topic: "Discovery call",
          duration: 12,
          recording_files: [
            {
              id: "recording-1",
              recording_type: "shared_screen_with_speaker_view",
              download_url: "https://example.com/video.mp4",
              file_extension: "mp4",
              file_type: "MP4",
            },
            {
              id: "recording-1",
              recording_type: "audio_only",
              download_url: "https://example.com/audio.m4a",
              file_extension: "m4a",
              file_type: "M4A",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    try {
      const result = await processZoomWebhookRequest(
        repository,
        {
          headers: { signature, timestamp },
          rawBody,
          env: {
            ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
          },
        },
        {
          storeSourceAsset,
        },
      );

      expect(result).toEqual({
        status: 200,
        body: { received: true },
      });
      expect(repository.createCall).toHaveBeenCalledWith({
        callTopic: "Discovery call",
        consentConfirmed: true,
        durationSeconds: 720,
        orgId: "org-1",
        recordingUrl: null,
        repId: "user-1",
        status: "uploaded",
        zoomMeetingId: "meeting-1",
        zoomRecordingId: "recording-1",
      });
      expect(fetchMock).toHaveBeenCalledWith("https://example.com/audio.m4a", {
        headers: { Authorization: "Bearer zoom-access" },
      });
      expect(storeSourceAsset).toHaveBeenCalledWith({
        bytes: Buffer.from("zoom-audio"),
        callId: "call-1",
        contentType: "audio/mp4",
        fileName: "recording-1.m4a",
      });
      expect(repository.updateCallRecording).toHaveBeenCalledWith(
        "call-1",
        "https://storage.example/recordings/call-1/source/recording-1.m4a",
      );
      expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith({
        callId: "call-1",
        sourceOrigin: "zoom_recording",
        sourceStoragePath: "recordings/call-1/source/recording-1.m4a",
        sourceFileName: "recording-1.m4a",
        sourceContentType: "audio/mp4",
        sourceSizeBytes: 10,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps zero-minute recording durations as zero seconds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(Buffer.from("zoom-audio"), {
        status: 200,
        headers: {
          "Content-Type": "audio/mp4",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const storeSourceAsset = vi.fn().mockResolvedValue({
      storagePath: "recordings/call-1/source/recording-1.m4a",
      publicUrl: "https://storage.example/recordings/call-1/source/recording-1.m4a",
    });

    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
    });
    const rawBody = JSON.stringify({
      event: "recording.completed",
      payload: {
        account_id: "zoom-account-1",
        object: {
          id: "meeting-1",
          topic: "Quick sync",
          duration: 0,
          recording_files: [
            {
              id: "recording-1",
              recording_type: "audio_only",
              download_url: "https://example.com/audio.m4a",
              file_extension: "m4a",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    try {
      await processZoomWebhookRequest(
        repository,
        {
          headers: { signature, timestamp },
          rawBody,
          env: {
            ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
          },
        },
        {
          storeSourceAsset,
        },
      );

      expect(repository.createCall).toHaveBeenCalledWith(
        expect.objectContaining({
          durationSeconds: 0,
        }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("skips undownloadable fallback recordings when a later file can be fetched", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(Buffer.from("zoom-audio"), {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const storeSourceAsset = vi.fn().mockResolvedValue({
      storagePath: "recordings/call-1/source/recording-1.mp4",
      publicUrl: "https://storage.example/recordings/call-1/source/recording-1.mp4",
    });

    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
    });
    const rawBody = JSON.stringify({
      event: "recording.completed",
      payload: {
        account_id: "zoom-account-1",
        object: {
          id: "meeting-1",
          topic: "Demo",
          duration: 12,
          recording_files: [
            {
              id: "recording-1",
              recording_type: "shared_screen_with_speaker_view",
              file_type: "MP4",
            },
            {
              id: "recording-1",
              recording_type: "speaker_view",
              download_url: "https://example.com/video.mp4",
              file_extension: "mp4",
              file_type: "MP4",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    try {
      await processZoomWebhookRequest(
        repository,
        {
          headers: { signature, timestamp },
          rawBody,
          env: {
            ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
          },
        },
        {
          storeSourceAsset,
        },
      );

      expect(fetchMock).toHaveBeenCalledWith("https://example.com/video.mp4", {
        headers: { Authorization: "Bearer zoom-access" },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("ignores duplicate recordings when an existing job is already active or complete", async () => {
    const repository = createRepository({
      findCallByZoomRecordingId: vi.fn().mockResolvedValue({
        id: "call-1",
        status: "uploaded",
        jobStatus: "running",
      }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
    });
    const rawBody = JSON.stringify({
      event: "recording.completed",
      payload: {
        account_id: "zoom-account-1",
        object: {
          recording_files: [{ id: "recording-1", download_url: "https://example.com/audio.m4a" }],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    const result = await processZoomWebhookRequest(repository, {
      headers: { signature, timestamp },
      rawBody,
      env: {
        ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
      },
    });

    expect(result).toEqual({
      status: 200,
      body: { received: true },
    });
    expect(repository.createCall).not.toHaveBeenCalled();
    expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
    expect(repository.updateCallStatus).not.toHaveBeenCalled();
  });

  it("reuses failed calls when Zoom replays the webhook", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(Buffer.from("zoom-audio"), {
        status: 200,
        headers: {
          "Content-Type": "audio/mp4",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const storeSourceAsset = vi.fn().mockResolvedValue({
      storagePath: "recordings/call-1/source/recording-1.m4a",
      publicUrl: "https://storage.example/recordings/call-1/source/recording-1.m4a",
    });
    const repository = createRepository({
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue({
        id: "call-1",
        status: "failed",
        jobStatus: "failed",
      }),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
    });
    const rawBody = JSON.stringify({
      event: "recording.completed",
      payload: {
        account_id: "zoom-account-1",
        object: {
          id: "meeting-1",
          topic: "Discovery call",
          duration: 12,
          recording_files: [
            {
              id: "recording-1",
              recording_type: "audio_only",
              download_url: "https://example.com/audio.m4a",
              file_extension: "m4a",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    try {
      const result = await processZoomWebhookRequest(
        repository,
        {
          headers: { signature, timestamp },
          rawBody,
          env: {
            ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
          },
        },
        {
          storeSourceAsset,
        },
      );

      expect(result).toEqual({
        status: 200,
        body: { received: true },
      });
      expect(repository.createCall).not.toHaveBeenCalled();
      expect(repository.updateCallStatus).toHaveBeenCalledWith("call-1", "uploaded");
      expect(storeSourceAsset).toHaveBeenCalledWith({
        bytes: Buffer.from("zoom-audio"),
        callId: "call-1",
        contentType: "audio/mp4",
        fileName: "recording-1.m4a",
      });
      expect(repository.updateCallRecording).toHaveBeenCalledWith(
        "call-1",
        "https://storage.example/recordings/call-1/source/recording-1.m4a",
      );
      expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith({
        callId: "call-1",
        sourceOrigin: "zoom_recording",
        sourceStoragePath: "recordings/call-1/source/recording-1.m4a",
        sourceFileName: "recording-1.m4a",
        sourceContentType: "audio/mp4",
        sourceSizeBytes: 10,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
