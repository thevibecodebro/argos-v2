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
    findCallByZoomRecordingId: vi.fn(),
    findPreferredCallOwner: vi.fn(),
    findZoomIntegrationByAccountId: vi.fn(),
    setCallEvaluation: vi.fn(),
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

  it("creates and scores a call when a recording is completed", async () => {
    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        orgId: "org-1",
        webhookToken: null,
      }),
      setCallEvaluation: vi.fn().mockResolvedValue(undefined),
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
    expect(repository.createCall).toHaveBeenCalledWith({
      callTopic: "Discovery call",
      consentConfirmed: true,
      durationSeconds: 720,
      orgId: "org-1",
      recordingUrl: "https://example.com/audio.m4a",
      repId: "user-1",
      status: "evaluating",
      zoomMeetingId: "meeting-1",
      zoomRecordingId: "recording-1",
    });
    expect(repository.setCallEvaluation).toHaveBeenCalledTimes(1);
  });

  it("ignores duplicate recordings", async () => {
    const repository = createRepository({
      findCallByZoomRecordingId: vi.fn().mockResolvedValue({ id: "call-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        orgId: "org-1",
        webhookToken: null,
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
    expect(repository.setCallEvaluation).not.toHaveBeenCalled();
  });
});
