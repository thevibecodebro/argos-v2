import { describe, expect, it, vi } from "vitest";
import { VoiceLifecycle } from "./voice-lifecycle";

describe("voice resource lifecycle", () => {
  it("releases microphone, peer and data channel immediately on unmount while stop is pending", () => {
    const stop = vi.fn(() => new Promise<void>(() => undefined));
    const lifecycle = new VoiceLifecycle(stop);
    const run = lifecycle.begin("s1", "segment1");
    const tracks = vi.fn(), peer = vi.fn(), channel = vi.fn();
    lifecycle.adopt(run, tracks); lifecycle.adopt(run, peer); lifecycle.adopt(run, channel);
    void lifecycle.stop();
    expect(tracks).toHaveBeenCalledOnce(); expect(peer).toHaveBeenCalledOnce(); expect(channel).toHaveBeenCalledOnce();
    expect(lifecycle.isCurrent(run)).toBe(false);
    expect(stop).toHaveBeenCalledWith(run);
  });
  it("stops a microphone permission promise resolving after unmount", async () => {
    const lifecycle = new VoiceLifecycle(async () => undefined);
    const run = lifecycle.begin("s1", "segment1");
    let resolve!: (value: { stop: () => void }) => void;
    const pendingMic = new Promise<{ stop: () => void }>((r) => { resolve = r; });
    const attach = pendingMic.then((track) => lifecycle.adopt(run, () => track.stop()));
    await lifecycle.stop();
    const stop = vi.fn(); resolve({ stop });
    expect(await attach).toBe(false); expect(stop).toHaveBeenCalledOnce();
  });
  it("invalidates pending SDP and transcript events when changing sessions", async () => {
    const lifecycle = new VoiceLifecycle(async () => undefined);
    const old = lifecycle.begin("s1", "segment1");
    let resolve!: () => void;
    const sdp = new Promise<void>((r) => { resolve = r; });
    const setRemoteDescription = vi.fn();
    const continuation = sdp.then(() => { if (lifecycle.isCurrent(old)) setRemoteDescription(); });
    const next = lifecycle.begin("s2", "segment2");
    resolve(); await continuation;
    expect(setRemoteDescription).not.toHaveBeenCalled(); expect(lifecycle.isCurrent(next)).toBe(true);
    expect(lifecycle.isCurrent(old)).toBe(false);
  });
  it("sends stop once even if stop/unmount/disconnect all fire", async () => {
    const stop = vi.fn(async () => undefined); const lifecycle = new VoiceLifecycle(stop);
    lifecycle.begin("s1", "segment1"); await Promise.all([lifecycle.stop(), lifecycle.stop()]);
    expect(stop).toHaveBeenCalledOnce();
  });
});
