import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  handler: null as null | ((request: { url: string }, response: unknown) => void),
  poll: null as null | { onPollError: (error: unknown) => void; onPollSuccess: () => void },
}));
vi.mock("node:fs", async (importOriginal) => ({ ...await importOriginal<typeof import("node:fs")>(), existsSync: () => false }));
vi.mock("node:http", () => ({
  createServer: (handler: typeof state.handler) => {
    state.handler = handler;
    return { listen: vi.fn() };
  },
}));
vi.mock("./env", () => ({ getWorkerEnv: () => ({ callProcessingEnabled: true, ghlImportEnabled: false, googleMeetImportEnabled: false, pollIntervalMs: 5000, host: "127.0.0.1", port: 0 }) }));
vi.mock("./calls/repository", () => ({ CallProcessingRepository: class {} }));
vi.mock("./jobs/process-call-job", () => ({ processCallJob: vi.fn() }));
vi.mock("./jobs/poll-call-processing-jobs", () => ({
  pollCallProcessingJobs: (input: typeof state.poll) => {
    state.poll = input;
    return new Promise<void>(() => undefined);
  },
}));

describe("worker health endpoint", () => {
  it("returns 503 until a successful poll, and reflects outage and recovery", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await import("./index");
      const readHealth = () => {
        const response = { writeHead: vi.fn(), end: vi.fn() };
        state.handler!({ url: "/health" }, response);
        return { status: response.writeHead.mock.calls[0][0], body: JSON.parse(response.end.mock.calls[0][0]) };
      };
      expect(readHealth()).toMatchObject({ status: 503, body: { ok: false } });
      state.poll!.onPollSuccess();
      expect(readHealth()).toMatchObject({ status: 200, body: { ok: true } });
      state.poll!.onPollError(new Error("Temporary database failure"));
      expect(readHealth()).toMatchObject({ status: 503, body: { ok: false } });
      state.poll!.onPollSuccess();
      expect(readHealth()).toMatchObject({ status: 200, body: { ok: true } });
    } finally {
      log.mockRestore();
    }
  });
});
