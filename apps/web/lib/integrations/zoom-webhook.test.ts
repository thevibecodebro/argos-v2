import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const checkRateLimitForPolicy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy,
}));

import {
  processZoomWebhookRequest,
  type ZoomWebhookRepository,
} from "./zoom-webhook";
import { CALL_SERVER_UPLOAD_MAX_BYTES } from "../calls/upload-contract";
import type { RubricsRepository } from "../rubrics/service";

function createRepository(
  overrides: Partial<ZoomWebhookRepository> = {},
): ZoomWebhookRepository {
  return {
    createCall: vi.fn(),
    createOrResetCallProcessingJob: vi.fn(),
    findActiveCallProcessingSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
    findCallByZoomRecordingId: vi.fn(),
    findIngestionTitleFilterConfig: vi.fn(),
    findPreferredCallOwner: vi.fn(),
    findZoomIntegrationByAccountId: vi.fn(),
    updateCallRecording: vi.fn(),
    updateCallRecordingStorage: vi.fn(),
    updateCallStatus: vi.fn(),
    updateZoomTokens: vi.fn(),
    ...overrides,
  };
}

function createRubricsRepository(
  overrides: Partial<RubricsRepository> = {},
): RubricsRepository {
  return {
    createDraftRubric: vi.fn(),
    findActiveRubricByOrgId: vi.fn().mockResolvedValue(null),
    findRubricHistoryByOrgId: vi.fn(),
    findCategoriesByRubricId: vi.fn(),
    publishDraftRubric: vi.fn(),
    ...overrides,
  } as unknown as RubricsRepository;
}

function sign(secret: string, rawBody: string, timestamp = Math.floor(Date.now() / 1000).toString()) {
  const message = `v0:${timestamp}:${rawBody}`;
  const signature = `v0=${crypto.createHmac("sha256", secret).update(message).digest("hex")}`;
  return { signature, timestamp };
}

beforeEach(() => {
  checkRateLimitForPolicy.mockReset();
  checkRateLimitForPolicy.mockResolvedValue({
    allowed: true,
    bucketKey: "zoomWebhookAccount:org:hash",
    limit: 300,
    remaining: 299,
    requestCount: 1,
    resetAt: new Date("2026-04-28T10:16:00.000Z"),
    retryAfterSeconds: 60,
  });
});

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

  it("does not look up integrations for attacker-controlled account IDs before signature verification", async () => {
    const repository = createRepository({
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
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
        account_id: "attacker-controlled-account",
        object: {
          recording_files: [{ id: "recording-1" }],
        },
      },
    });

    const result = await processZoomWebhookRequest(repository, {
      headers: { signature: "v0=invalid", timestamp: Math.floor(Date.now() / 1000).toString() },
      rawBody,
      env: {
        ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
      },
    });

    expect(result).toEqual({
      status: 401,
      body: { error: "Invalid webhook signature" },
    });
    expect(repository.findZoomIntegrationByAccountId).not.toHaveBeenCalled();
  });

  it("prefers the app-level webhook secret over a stale integration token", async () => {
    const repository = createRepository({
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue(null),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: "stale-integration-secret",
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
          id: "meeting-1",
          recording_files: [
            {
              id: "recording-1",
              download_url: "https://us02web.zoom.us/rec/download/recording-1.m4a",
              file_extension: "M4A",
              file_type: "M4A",
              recording_type: "audio_only",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("app-level-secret", rawBody);

    const result = await processZoomWebhookRequest(repository, {
      headers: { signature, timestamp },
      rawBody,
      env: {
        ZOOM_WEBHOOK_SECRET_TOKEN: "app-level-secret",
      },
    });

    expect(result).toEqual({
      status: 200,
      body: { received: true },
    });
  });

  it("rejects signatures made with a legacy per-row webhook token when the global secret is missing", async () => {
    const repository = createRepository({
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: "legacy-row-secret",
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
          id: "meeting-1",
          recording_files: [
            {
              id: "recording-1",
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
              file_extension: "m4a",
              recording_type: "audio_only",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("legacy-row-secret", rawBody);

    const result = await processZoomWebhookRequest(repository, {
      headers: { signature, timestamp },
      rawBody,
      env: {},
    });

    expect(result).toEqual({
      status: 401,
      body: { error: "Invalid webhook signature" },
    });
  });

  it("returns 429 after signature verification when the Zoom account/org limit is exceeded", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      bucketKey: "zoomWebhookAccount:org:hash",
      limit: 300,
      remaining: 0,
      requestCount: 301,
      resetAt: new Date("2026-04-28T10:16:00.000Z"),
      retryAfterSeconds: 12,
    });
    const repository = createRepository({
      findCallByZoomRecordingId: vi.fn(),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
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
          id: "meeting-1",
          recording_files: [
            {
              id: "recording-1",
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
              file_extension: "m4a",
              recording_type: "audio_only",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("app-level-secret", rawBody);

    const result = await processZoomWebhookRequest(repository, {
      headers: { signature, timestamp },
      rawBody,
      env: {
        ZOOM_WEBHOOK_SECRET_TOKEN: "app-level-secret",
      },
    });

    expect(result).toEqual({
      status: 429,
      body: {
        code: "rate_limit_exceeded",
        error: "Too many requests. Try again later.",
        retryAfterSeconds: 12,
      },
      headers: { "Retry-After": "12" },
    });
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("zoomWebhookAccount", {
      type: "org",
      id: "org-1:zoom-account-1",
    });
    expect(repository.findCallByZoomRecordingId).not.toHaveBeenCalled();
  });

  it.each([
    {
      config: {
        configured: false,
        excludePhrases: [],
        includePhrases: [],
      },
      reason: "unconfigured",
      topic: "Customer discovery",
    },
    {
      config: {
        configured: true,
        excludePhrases: [],
        includePhrases: ["Weekly review"],
      },
      reason: "missing_title",
      topic: undefined,
    },
    {
      config: {
        configured: true,
        excludePhrases: ["Internal calibration"],
        includePhrases: ["Weekly review"],
      },
      reason: "excluded",
      topic: "Weekly review - Internal calibration",
    },
    {
      config: {
        configured: true,
        excludePhrases: [],
        includePhrases: ["Weekly review"],
      },
      reason: "no_include_match",
      topic: "Customer discovery",
    },
  ])(
    "rejects $reason before entitlement, owner, token refresh, download, storage, call creation, and queueing",
    async ({ config, reason, topic }) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const recordIngestionTitleDecision = vi.fn();
      const storeSourceAsset = vi.fn();
      const rubricsRepository = createRubricsRepository();
      const repository = createRepository({
        findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
        findIngestionTitleFilterConfig: vi.fn().mockResolvedValue(config),
        findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
        findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
          id: "zoom-integration-1",
          orgId: "org-1",
          webhookToken: null,
          accessToken: "zoom-access",
          refreshToken: "zoom-refresh",
          tokenExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
        }),
      });
      const rawBody = JSON.stringify({
        event: "recording.completed",
        payload: {
          account_id: "zoom-account-1",
          object: {
            id: "meeting-1",
            topic,
            recording_files: [
              {
                id: "recording-1",
                recording_type: "audio_only",
                download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
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
              ARGOS_INGESTION_TITLE_FILTERS_ENFORCED: "true",
              ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
            },
          },
          {
            recordIngestionTitleDecision,
            rubricsRepository,
            storeSourceAsset,
          },
        );

        expect(result).toEqual({
          status: 200,
          body: { received: true },
        });
        expect(repository.findIngestionTitleFilterConfig).toHaveBeenCalledWith("org-1");
        expect(recordIngestionTitleDecision).toHaveBeenCalledWith({
          accepted: false,
          orgId: "org-1",
          reason,
          recordingId: "recording-1",
        });
        expect(repository.findActiveCallProcessingSubscription).not.toHaveBeenCalled();
        expect(repository.findPreferredCallOwner).not.toHaveBeenCalled();
        expect(repository.updateZoomTokens).not.toHaveBeenCalled();
        expect(rubricsRepository.findActiveRubricByOrgId).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(storeSourceAsset).not.toHaveBeenCalled();
        expect(repository.createCall).not.toHaveBeenCalled();
        expect(repository.updateCallRecordingStorage).not.toHaveBeenCalled();
        expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it("logs only safe title decision fields with the default recorder", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const repository = createRepository({
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findIngestionTitleFilterConfig: vi.fn().mockResolvedValue({
        configured: true,
        excludePhrases: ["Private phrase"],
        includePhrases: ["Sensitive customer"],
      }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
    });
    const rawBody = JSON.stringify({
      event: "recording.completed",
      payload: {
        account_id: "zoom-account-1",
        object: {
          topic: "Sensitive customer - Private phrase",
          recording_files: [
            {
              id: "recording-1",
              recording_type: "audio_only",
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
              file_extension: "m4a",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    try {
      await processZoomWebhookRequest(repository, {
        headers: { signature, timestamp },
        rawBody,
        env: {
          ARGOS_INGESTION_TITLE_FILTERS_ENFORCED: "true",
          ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
        },
      });

      expect(consoleInfo).toHaveBeenCalledWith("zoom_ingestion_title_filter_decision", {
        accepted: false,
        orgId: "org-1",
        reason: "excluded",
        recordingId: "recording-1",
      });
      expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("Sensitive customer");
      expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("Private phrase");
    } finally {
      consoleInfo.mockRestore();
    }
  });

  it("preserves the existing import path without reading title config when rollout is off", async () => {
    const recordIngestionTitleDecision = vi.fn();
    const repository = createRepository({
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findIngestionTitleFilterConfig: vi.fn().mockResolvedValue({
        configured: false,
        excludePhrases: [],
        includePhrases: [],
      }),
      findPreferredCallOwner: vi.fn().mockResolvedValue(null),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
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
          topic: "Customer discovery",
          recording_files: [
            {
              id: "recording-1",
              recording_type: "audio_only",
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
              file_extension: "m4a",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    const result = await processZoomWebhookRequest(
      repository,
      {
        headers: { signature, timestamp },
        rawBody,
        env: {
          ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
        },
      },
      { recordIngestionTitleDecision },
    );

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(repository.findIngestionTitleFilterConfig).not.toHaveBeenCalled();
    expect(recordIngestionTitleDecision).not.toHaveBeenCalled();
    expect(repository.findActiveCallProcessingSubscription).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: null,
    });
    expect(repository.findPreferredCallOwner).toHaveBeenCalledWith("org-1");
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
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/recording-1.m4a",
      contentType: "audio/mp4",
      fileSizeBytes: 10,
    });
    const rubricsRepository = createRubricsRepository({
      findActiveRubricByOrgId: vi.fn().mockResolvedValue({
        id: "rubric-1",
        orgId: "org-1",
        name: "Revenue Scorecard",
        description: null,
        sourceType: "manual",
        status: "active",
        version: 1,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        publishedAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
    });
    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findIngestionTitleFilterConfig: vi.fn().mockResolvedValue({
        configured: true,
        excludePhrases: [],
        includePhrases: ["Discovery"],
      }),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
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
              download_url: "https://us02web.zoom.us/rec/download/video.mp4",
              file_extension: "mp4",
              file_type: "MP4",
            },
            {
              id: "recording-1",
              recording_type: "audio_only",
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
              file_extension: "m4a",
              file_type: "M4A",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);
    const recordIngestionTitleDecision = vi.fn();

    try {
      const result = await processZoomWebhookRequest(
        repository,
        {
          headers: { signature, timestamp },
          rawBody,
          env: {
            ARGOS_INGESTION_TITLE_FILTERS_ENFORCED: "true",
            ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
          },
        },
        {
          recordIngestionTitleDecision,
          rubricsRepository,
          storeSourceAsset,
        },
      );

      expect(result).toEqual({
        status: 200,
        body: { received: true },
      });
      expect(recordIngestionTitleDecision).toHaveBeenCalledWith({
        accepted: true,
        orgId: "org-1",
        reason: "included",
        recordingId: "recording-1",
      });
      expect(repository.createCall).toHaveBeenCalledWith({
        callTopic: "Discovery call",
        consentConfirmed: true,
        durationSeconds: 720,
        orgId: "org-1",
        rubricId: "rubric-1",
        recordingUrl: null,
        repId: "user-1",
        status: "uploaded",
        zoomMeetingId: "meeting-1",
        zoomRecordingId: "recording-1",
      });
      expect(fetchMock).toHaveBeenCalledWith("https://us02web.zoom.us/rec/download/audio.m4a", {
        headers: { Authorization: "Bearer zoom-access" },
        redirect: "manual",
        signal: expect.any(AbortSignal),
      });
      expect(storeSourceAsset).toHaveBeenCalledWith({
        bytes: Buffer.from("zoom-audio"),
        callId: "call-1",
        contentType: "audio/mp4",
        fileName: "recording-1.m4a",
      });
      expect(repository.updateCallRecording).not.toHaveBeenCalled();
      expect(repository.updateCallRecordingStorage).toHaveBeenCalledWith("call-1", {
        storageBucket: "call-recordings",
        storagePath: "recordings/call-1/source/recording-1.m4a",
        contentType: "audio/mp4",
        fileSizeBytes: 10,
      });
      expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith({
        callId: "call-1",
        rubricId: "rubric-1",
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

  it("does not create or store a call when Zoom is revoked during download", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Buffer.from("zoom-audio"), {
          status: 200,
          headers: { "Content-Type": "audio/mp4" },
        }),
      ),
    );
    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
      }),
    });
    const rawBody = JSON.stringify({
      event: "recording.completed",
      payload: {
        account_id: "zoom-account-1",
        object: {
          id: "meeting-1",
          topic: "Discovery call",
          recording_files: [
            {
              id: "recording-1",
              recording_type: "audio_only",
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
              file_extension: "m4a",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);
    const canIngestOrganization = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const storeSourceAsset = vi.fn();

    try {
      const result = await processZoomWebhookRequest(
        repository,
        {
          headers: { signature, timestamp },
          rawBody,
          env: { ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret" },
        },
        {
          canIngestOrganization,
          rubricsRepository: createRubricsRepository(),
          storeSourceAsset,
        },
      );

      expect(result).toEqual({ status: 200, body: { received: true } });
      expect(repository.createCall).not.toHaveBeenCalled();
      expect(storeSourceAsset).not.toHaveBeenCalled();
      expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("acknowledges Zoom recordings without importing when the org has no active processing entitlement", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const storeSourceAsset = vi.fn();
    const callProcessingEntitlementsRepository = {
      findActiveCallProcessingSubscription: vi.fn().mockResolvedValue(null),
    };
    const repository = createRepository({
      createCall: vi.fn(),
      createOrResetCallProcessingJob: vi.fn(),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
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
          id: "meeting-1",
          topic: "Discovery call",
          duration: 12,
          recording_files: [
            {
              id: "recording-1",
              recording_type: "audio_only",
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
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
          callProcessingEntitlementsRepository,
          storeSourceAsset,
        },
      );

      expect(result).toEqual({
        status: 200,
        body: { received: true },
      });
      expect(callProcessingEntitlementsRepository.findActiveCallProcessingSubscription).toHaveBeenCalledWith({
        orgId: "org-1",
        userId: null,
      });
      expect(repository.findPreferredCallOwner).not.toHaveBeenCalled();
      expect(repository.createCall).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(storeSourceAsset).not.toHaveBeenCalled();
      expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects oversized Zoom recording downloads before buffering the provider body", async () => {
    const readBody = vi.fn().mockResolvedValue(new ArrayBuffer(0));
    const oversizedResponse = {
      ok: true,
      status: 200,
      body: {},
      headers: new Headers({
        "Content-Length": String(CALL_SERVER_UPLOAD_MAX_BYTES + 1),
        "Content-Type": "audio/mp4",
      }),
      arrayBuffer: readBody,
    } as unknown as Response;
    const fetchMock = vi.fn().mockResolvedValue(oversizedResponse);
    vi.stubGlobal("fetch", fetchMock);

    const storeSourceAsset = vi.fn().mockResolvedValue({
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/recording-1.m4a",
      contentType: "audio/mp4",
      fileSizeBytes: 0,
    });
    const rubricsRepository = createRubricsRepository({
      findActiveRubricByOrgId: vi.fn().mockResolvedValue({
        id: "rubric-1",
        orgId: "org-1",
        name: "Revenue Scorecard",
        description: null,
        sourceType: "manual",
        status: "active",
        version: 1,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        publishedAt: new Date("2026-04-17T00:00:00.000Z"),
      }),
    });
    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
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
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
              file_extension: "m4a",
              file_type: "M4A",
            },
          ],
        },
      },
    });
    const { signature, timestamp } = sign("webhook-secret", rawBody);

    try {
      await expect(
        processZoomWebhookRequest(
          repository,
          {
            headers: { signature, timestamp },
            rawBody,
            env: {
              ZOOM_WEBHOOK_SECRET_TOKEN: "webhook-secret",
            },
          },
          {
            rubricsRepository,
            storeSourceAsset,
          },
        ),
      ).rejects.toThrow("Response body exceeds");

      expect(readBody).not.toHaveBeenCalled();
      expect(storeSourceAsset).not.toHaveBeenCalled();
      expect(repository.updateCallRecordingStorage).not.toHaveBeenCalled();
      expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
      expect(repository.createCall).not.toHaveBeenCalled();
      expect(repository.updateCallStatus).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not fetch or store provider recording URLs outside trusted Zoom hosts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(Buffer.from("attacker-audio"), {
        status: 200,
        headers: {
          "Content-Type": "audio/mp4",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const storeSourceAsset = vi.fn().mockResolvedValue({
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/recording-1.m4a",
      contentType: "audio/mp4",
      fileSizeBytes: 14,
    });
    const rubricsRepository = createRubricsRepository();
    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
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
              download_url: "https://attacker.example/audio.m4a",
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
          rubricsRepository,
          storeSourceAsset,
        },
      );

      expect(result).toEqual({
        status: 200,
        body: { received: true },
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(repository.findCallByZoomRecordingId).not.toHaveBeenCalled();
      expect(repository.createCall).not.toHaveBeenCalled();
      expect(storeSourceAsset).not.toHaveBeenCalled();
      expect(repository.updateCallRecordingStorage).not.toHaveBeenCalled();
      expect(repository.createOrResetCallProcessingJob).not.toHaveBeenCalled();
      expect(repository.updateCallStatus).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("follows trusted Zoom recording redirects without leaving the allowlist", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            Location: "/rec/download/final-audio.m4a",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from("zoom-audio"), {
          status: 200,
          headers: {
            "Content-Type": "audio/mp4",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const storeSourceAsset = vi.fn().mockResolvedValue({
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/recording-1.m4a",
      contentType: "audio/mp4",
      fileSizeBytes: 10,
    });
    const rubricsRepository = createRubricsRepository();
    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
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
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
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
          rubricsRepository,
          storeSourceAsset,
        },
      );

      expect(result).toEqual({
        status: 200,
        body: { received: true },
      });
      expect(fetchMock).toHaveBeenNthCalledWith(1, "https://us02web.zoom.us/rec/download/audio.m4a", {
        headers: { Authorization: "Bearer zoom-access" },
        redirect: "manual",
        signal: expect.any(AbortSignal),
      });
      expect(fetchMock).toHaveBeenNthCalledWith(2, "https://us02web.zoom.us/rec/download/final-audio.m4a", {
        headers: { Authorization: "Bearer zoom-access" },
        redirect: "manual",
        signal: expect.any(AbortSignal),
      });
      expect(storeSourceAsset).toHaveBeenCalledWith({
        bytes: Buffer.from("zoom-audio"),
        callId: "call-1",
        contentType: "audio/mp4",
        fileName: "recording-1.m4a",
      });
      expect(repository.updateCallStatus).not.toHaveBeenCalled();
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
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/recording-1.m4a",
      contentType: "audio/mp4",
      fileSizeBytes: 10,
    });
    const rubricsRepository = createRubricsRepository();

    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
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
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
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
          rubricsRepository,
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

  it("skips untrusted fallback recordings when a later trusted file can be fetched", async () => {
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
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/recording-1.mp4",
      contentType: "video/mp4",
      fileSizeBytes: 10,
    });
    const rubricsRepository = createRubricsRepository();

    const repository = createRepository({
      createCall: vi.fn().mockResolvedValue({ id: "call-1" }),
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue(null),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
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
              download_url: "https://attacker.example/video.mp4",
              file_type: "MP4",
            },
            {
              id: "recording-1",
              recording_type: "speaker_view",
              download_url: "https://us02web.zoom.us/rec/download/video.mp4",
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
          rubricsRepository,
          storeSourceAsset,
        },
      );

      expect(fetchMock).toHaveBeenCalledWith("https://us02web.zoom.us/rec/download/video.mp4", {
        headers: { Authorization: "Bearer zoom-access" },
        redirect: "manual",
        signal: expect.any(AbortSignal),
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
        id: "zoom-integration-1",
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
          recording_files: [{ id: "recording-1", download_url: "https://us02web.zoom.us/rec/download/audio.m4a" }],
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
    expect(repository.findCallByZoomRecordingId).toHaveBeenCalledWith({
      orgId: "org-1",
      zoomRecordingId: "recording-1",
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
      storageBucket: "call-recordings",
      storagePath: "recordings/call-1/source/recording-1.m4a",
      contentType: "audio/mp4",
      fileSizeBytes: 10,
    });
    const rubricsRepository = createRubricsRepository();
    const repository = createRepository({
      createOrResetCallProcessingJob: vi.fn().mockResolvedValue(undefined),
      findCallByZoomRecordingId: vi.fn().mockResolvedValue({
        id: "call-1",
        status: "failed",
        jobStatus: "failed",
      }),
      findPreferredCallOwner: vi.fn().mockResolvedValue({ id: "user-1" }),
      findZoomIntegrationByAccountId: vi.fn().mockResolvedValue({
        id: "zoom-integration-1",
        orgId: "org-1",
        webhookToken: null,
        accessToken: "zoom-access",
        refreshToken: "zoom-refresh",
        tokenExpiresAt: new Date("2026-04-18T00:00:00.000Z"),
      }),
      updateCallRecording: vi.fn().mockResolvedValue(undefined),
      updateCallRecordingStorage: vi.fn().mockResolvedValue(undefined),
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
              download_url: "https://us02web.zoom.us/rec/download/audio.m4a",
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
          rubricsRepository,
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
      expect(repository.updateCallRecording).not.toHaveBeenCalled();
      expect(repository.updateCallRecordingStorage).toHaveBeenCalledWith("call-1", {
        storageBucket: "call-recordings",
        storagePath: "recordings/call-1/source/recording-1.m4a",
        contentType: "audio/mp4",
        fileSizeBytes: 10,
      });
      expect(repository.createOrResetCallProcessingJob).toHaveBeenCalledWith({
        callId: "call-1",
        rubricId: null,
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
