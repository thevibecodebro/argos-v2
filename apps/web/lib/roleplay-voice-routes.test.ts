import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createRoleplayRepository = vi.fn();
const getRoleplaySession = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/roleplay/create-repository", () => ({
  createRoleplayRepository,
}));

vi.mock("@/lib/roleplay/service", () => ({
  getRoleplaySession,
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
    createRoleplayRepository.mockReturnValue({});
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
        },
        transcript: [
          { role: "assistant", content: "Show me the ROI math." },
          { role: "user", content: "We cut onboarding time by 32%." },
        ],
      },
    });
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
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
  });
});
