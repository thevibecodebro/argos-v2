import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createRoleplayRepository = vi.fn();
const getRoleplaySession = vi.fn();
const appendRoleplayTranscriptMessage = vi.fn();
const completeRoleplaySession = vi.fn();
const markRoleplayVoiceStarted = vi.fn();
const settleRoleplayVoiceUsage = vi.fn();
const checkRateLimitForPolicy = vi.fn();
const getVoiceEntitlementStatus = vi.fn();
const consumeVoiceMinutes = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/roleplay/create-repository", () => ({
  createRoleplayRepository,
}));

vi.mock("@/lib/roleplay/service", () => ({
  getRoleplaySession,
  appendRoleplayTranscriptMessage,
  completeRoleplaySession,
  markRoleplayVoiceStarted,
  settleRoleplayVoiceUsage,
}));

vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy,
  rateLimitExceededResponse: (result: { retryAfterSeconds: number }) =>
    Response.json(
      {
        code: "rate_limit_exceeded",
        error: "Too many requests. Try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    ),
}));

vi.mock("@/lib/billing/repository", () => ({
  DrizzleBillingRepository: vi.fn(() => ({ billing: true })),
}));

vi.mock("@/lib/billing/voice-entitlements", () => ({
  getVoiceEntitlementStatus,
  consumeVoiceMinutes,
}));

describe("roleplay voice routes", () => {
  const originalEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_REALTIME_MODEL: process.env.OPENAI_REALTIME_MODEL,
    OPENAI_REALTIME_VOICE: process.env.OPENAI_REALTIME_VOICE,
    OPENAI_TTS_MODEL: process.env.OPENAI_TTS_MODEL,
    OPENAI_TTS_VOICE: process.env.OPENAI_TTS_VOICE,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createRoleplayRepository.mockReset();
    getRoleplaySession.mockReset();
    appendRoleplayTranscriptMessage.mockReset();
    completeRoleplaySession.mockReset();
    markRoleplayVoiceStarted.mockReset();
    settleRoleplayVoiceUsage.mockReset();
    checkRateLimitForPolicy.mockReset();
    getVoiceEntitlementStatus.mockReset();
    consumeVoiceMinutes.mockReset();
    createRoleplayRepository.mockReturnValue({});
    getVoiceEntitlementStatus.mockResolvedValue({
      ok: true,
      data: {
        availableMinutes: 120,
        orgId: "org-1",
        userId: "auth-user-1",
      },
    });
    consumeVoiceMinutes.mockResolvedValue({ ok: true, data: { minutesDebited: 1 } });
    markRoleplayVoiceStarted.mockResolvedValue({
      ok: true,
      data: {
        id: "session-1",
        persona: "skeptical-cfo",
        voiceStartedAt: "2026-05-11T20:00:00.000Z",
        voiceCompletedAt: null,
        voiceMinutesSettled: 0,
        voiceSettledAt: null,
      },
    });
    completeRoleplaySession.mockResolvedValue({
      ok: true,
      data: {
        id: "session-1",
        status: "complete",
        voiceStartedAt: "2026-05-11T20:00:00.000Z",
        voiceCompletedAt: null,
        voiceMinutesSettled: 0,
        voiceSettledAt: null,
      },
    });
    settleRoleplayVoiceUsage.mockResolvedValue({
      ok: true,
      data: {
        id: "session-1",
        status: "complete",
        voiceStartedAt: "2026-05-11T20:00:00.000Z",
        voiceCompletedAt: "2026-05-11T20:08:10.000Z",
        voiceMinutesSettled: 9,
        voiceSettledAt: "2026-05-11T20:08:10.000Z",
      },
    });
    getRoleplaySession.mockResolvedValue({
      ok: true,
      data: {
        id: "session-1",
        persona: "skeptical-cfo",
        personaDetails: {
          id: "skeptical-cfo",
          name: "Dana Mercer",
          role: "CFO",
          company: "Apex Manufacturing",
          industry: "Manufacturing",
          difficulty: "advanced",
          objectionType: "ROI & Budget",
          description: "Numbers-first evaluator.",
          avatarInitials: "DM",
          voice: "marin",
        },
        transcript: [
          { role: "assistant", content: "Show me the ROI math." },
          { role: "user", content: "We cut onboarding time by 32%." },
        ],
      },
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      requestCount: 1,
      retryAfterSeconds: 3600,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "roleplayTts:user:hash",
    });
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_REALTIME_MODEL;
    delete process.env.OPENAI_REALTIME_VOICE;
    delete process.env.OPENAI_TTS_MODEL;
    delete process.env.OPENAI_TTS_VOICE;
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
    process.env.OPENAI_REALTIME_MODEL = originalEnv.OPENAI_REALTIME_MODEL;
    process.env.OPENAI_REALTIME_VOICE = originalEnv.OPENAI_REALTIME_VOICE;
    process.env.OPENAI_TTS_MODEL = originalEnv.OPENAI_TTS_MODEL;
    process.env.OPENAI_TTS_VOICE = originalEnv.OPENAI_TTS_VOICE;
  });

  it("returns 503 for realtime when OpenAI voice config is missing", async () => {
    const route = await import("../app/api/roleplay/sessions/[id]/realtime/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/sessions/session-1/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: "v=0",
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("OPENAI_API_KEY"),
    });
  });

  it("proxies a WebRTC offer to OpenAI and returns an answer SDP payload", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("v=0\r\na=answer-sdp", {
        status: 200,
        headers: { "Content-Type": "application/sdp" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/sessions/[id]/realtime/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/sessions/session-1/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: "v=0\r\na=offer-sdp",
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/sdp");
    await expect(response.text()).resolves.toBe("v=0\r\na=answer-sdp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/realtime/calls");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(getVoiceEntitlementStatus).toHaveBeenCalledWith({ billing: true }, "auth-user-1");
    expect(markRoleplayVoiceStarted).toHaveBeenCalledWith(
      {},
      "auth-user-1",
      "session-1",
      expect.any(Date),
    );
    expect(consumeVoiceMinutes).not.toHaveBeenCalled();
  });

  it("settles realtime voice usage after completing and scoring a roleplay", async () => {
    const route = await import("../app/api/roleplay/sessions/[id]/complete/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/sessions/session-1/complete", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "session-1",
      status: "complete",
      voiceMinutesSettled: 9,
    });
    expect(completeRoleplaySession).toHaveBeenCalledWith({}, "auth-user-1", "session-1");
    expect(settleRoleplayVoiceUsage).toHaveBeenCalledWith(
      {},
      "auth-user-1",
      "session-1",
      expect.objectContaining({
        consumeVoiceMinutes: expect.any(Function),
      }),
    );
  });

  it("returns 402 for realtime when the workspace has no voice minutes", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    getVoiceEntitlementStatus.mockResolvedValueOnce({
      ok: false,
      status: 402,
      code: "voice_minutes_exhausted",
      error: "No live voice minutes are available for this workspace.",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/sessions/[id]/realtime/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/sessions/session-1/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: "v=0\r\na=offer-sdp",
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({
      code: "voice_minutes_exhausted",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the selected persona voice when creating realtime roleplay calls", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    getRoleplaySession.mockResolvedValueOnce({
      ok: true,
      data: {
        id: "session-1",
        persona: "busy-ops-director",
        personaDetails: {
          id: "busy-ops-director",
          name: "Marcus Webb",
          role: "Director of Operations",
          company: "FastTrack Logistics",
          industry: "Logistics",
          difficulty: "intermediate",
          objectionType: "Time & Bandwidth",
          description: "Time-starved operations leader.",
          avatarInitials: "MW",
          voice: "cedar",
        },
        transcript: [],
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("v=0\r\na=answer-sdp", {
        status: 200,
        headers: { "Content-Type": "application/sdp" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/sessions/[id]/realtime/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/sessions/session-1/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: "v=0\r\na=offer-sdp",
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const session = JSON.parse(String(body.get("session"))) as {
      audio?: { output?: { voice?: string } };
    };
    expect(session.audio?.output?.voice).toBe("cedar");
  });

  it("uses the generated buyer voice for roleplays created from real calls", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    getRoleplaySession.mockResolvedValueOnce({
      ok: true,
      data: {
        id: "session-generated-1",
        persona: null,
        personaDetails: null,
        origin: "generated_from_call",
        transcript: [],
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response("v=0\r\na=answer-sdp", {
        status: 200,
        headers: { "Content-Type": "application/sdp" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/sessions/[id]/realtime/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/sessions/session-generated-1/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: "v=0\r\na=offer-sdp",
      }),
      { params: Promise.resolve({ id: "session-generated-1" }) },
    );

    expect(response.status).toBe(200);
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const session = JSON.parse(String(body.get("session"))) as {
      audio?: { output?: { voice?: string } };
    };
    expect(session.audio?.output?.voice).toBe("cedar");
  });

  it("rejects oversized realtime SDP offers before contacting OpenAI", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/sessions/[id]/realtime/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/sessions/session-1/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: `v=0\r\n${"a".repeat(80_000)}`,
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("SDP offer is too large"),
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getRoleplaySession).not.toHaveBeenCalled();
  });

  it("rejects oversized realtime SDP content-length before reading the body", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/sessions/[id]/realtime/route");
    const request = new Request("http://localhost:3100/api/roleplay/sessions/session-1/realtime", {
      method: "POST",
      headers: {
        "Content-Length": "80000",
        "Content-Type": "application/sdp",
      },
      body: "v=0",
    });
    const textSpy = vi.spyOn(request, "text");
    const response = await route.POST(request, { params: Promise.resolve({ id: "session-1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("SDP offer is too large"),
    });
    expect(textSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getRoleplaySession).not.toHaveBeenCalled();
  });

  it("returns 503 for TTS when OpenAI speech config is missing", async () => {
    const route = await import("../app/api/roleplay/tts/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Listen back to the coaching note." }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("OPENAI_API_KEY"),
    });
  });

  it("returns 429 when the user TTS limit is exceeded", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      limit: 60,
      remaining: 0,
      requestCount: 61,
      retryAfterSeconds: 125,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      bucketKey: "roleplayTts:user:hash",
    });

    const route = await import("../app/api/roleplay/tts/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Listen back to the coaching note." }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("125");
    await expect(response.json()).resolves.toMatchObject({
      code: "rate_limit_exceeded",
      retryAfterSeconds: 125,
    });
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("roleplayTts", {
      type: "user",
      id: "auth-user-1",
    });
  });

  it("returns OpenAI speech audio as mp3", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";

    const audioBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(audioBytes, {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/tts/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Listen back to the coaching note." }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(audioBytes));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/audio/speech");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(getVoiceEntitlementStatus).toHaveBeenCalledWith({ billing: true }, "auth-user-1");
    expect(consumeVoiceMinutes).toHaveBeenCalledWith(
      { billing: true },
      "auth-user-1",
      expect.objectContaining({
        minutes: 1,
        source: "roleplay_tts",
      }),
    );
  });

  it("returns 402 for TTS when the workspace has no voice minutes", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    getVoiceEntitlementStatus.mockResolvedValueOnce({
      ok: false,
      status: 402,
      code: "voice_minutes_exhausted",
      error: "No live voice minutes are available for this workspace.",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/tts/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Listen back to the coaching note." }),
      }),
    );

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({
      code: "voice_minutes_exhausted",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized TTS text and instructions before contacting OpenAI", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/tts/route");
    const textResponse = await route.POST(
      new Request("http://localhost:3100/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "A".repeat(5_000) }),
      }),
    );

    expect(textResponse.status).toBe(400);
    await expect(textResponse.json()).resolves.toMatchObject({
      error: expect.stringContaining("text must be"),
    });

    const instructionsResponse = await route.POST(
      new Request("http://localhost:3100/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Short coaching line.",
          instructions: "A".repeat(3_000),
        }),
      }),
    );

    expect(instructionsResponse.status).toBe(400);
    await expect(instructionsResponse.json()).resolves.toMatchObject({
      error: expect.stringContaining("instructions must be"),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized TTS JSON content-length before auth or provider calls", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const route = await import("../app/api/roleplay/tts/route");
    const request = new Request("http://localhost:3100/api/roleplay/tts", {
      method: "POST",
      headers: {
        "Content-Length": "20000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: "Short coaching line." }),
    });
    const jsonSpy = vi.spyOn(request, "json");
    const response = await route.POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("request body is too large"),
    });
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(getAuthenticatedSupabaseUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("persists a realtime transcript turn through the roleplay service", async () => {
    appendRoleplayTranscriptMessage.mockResolvedValue({
      ok: true,
      data: {
        id: "session-1",
        repId: "rep-1",
        orgId: "org-1",
        persona: "skeptical-cfo",
        personaDetails: null,
        industry: "Manufacturing",
        difficulty: "advanced",
        overallScore: null,
        origin: "manual",
        sourceCallId: null,
        rubricId: null,
        focusMode: "all",
        focusCategorySlug: null,
        scenarioSummary: null,
        scenarioBrief: null,
        transcript: [
          { role: "assistant", content: "Show me the ROI math." },
          { role: "user", content: "We cut onboarding time by 32%." },
          { role: "assistant", content: "I still need a clear next step before I commit." },
        ],
        scorecard: null,
        status: "active",
        createdAt: "2026-04-03T00:00:00.000Z",
      },
    });

    const route = await import("../app/api/roleplay/sessions/[id]/transcript/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/roleplay/sessions/session-1/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "assistant",
          content: "I still need a clear next step before I commit.",
        }),
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "session-1",
      transcript: expect.arrayContaining([
        { role: "assistant", content: "I still need a clear next step before I commit." },
      ]),
    });
    expect(appendRoleplayTranscriptMessage).toHaveBeenCalledWith(
      {},
      "auth-user-1",
      "session-1",
      {
        role: "assistant",
        content: "I still need a clear next step before I commit.",
      },
    );
  });
});
