import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runFfmpeg } from "./ffmpeg";

class FakeChildProcess extends EventEmitter {
  kill = vi.fn(() => true);
}

describe("runFfmpeg", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("kills and rejects ffmpeg processes that exceed the execution timeout", async () => {
    vi.useFakeTimers();
    const child = new FakeChildProcess();
    const spawn = vi.fn(() => child);
    const execution = runFfmpeg("/usr/local/bin/ffmpeg", ["-i", "source.mp4"], spawn as never);
    const observed = execution.then(
      () => ({ error: null }),
      (error: unknown) => ({ error }),
    );

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1);

    const state = await observed;
    expect(state.error).toEqual(expect.any(Error));
    expect((state.error as Error).message).toContain("timed out");
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });
});
