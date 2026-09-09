/** Owns asynchronous voice resources; late microphone/SDP work cannot revive a stopped run. */
export type VoiceRun = { sessionId: string; segmentId: string; cleanups: Set<() => void> };
export class VoiceLifecycle {
  private current: VoiceRun | null = null;
  constructor(private readonly onStop: (run: VoiceRun) => Promise<void>) {}
  begin(sessionId: string, segmentId: string) {
    void this.stop();
    const run = { sessionId, segmentId, cleanups: new Set<() => void>() };
    this.current = run;
    return run;
  }
  isCurrent(run: VoiceRun) { return this.current === run; }
  adopt(run: VoiceRun, dispose: () => void) {
    if (!this.isCurrent(run)) { dispose(); return false; }
    run.cleanups.add(dispose);
    return true;
  }
  stop() {
    const run = this.current;
    this.current = null;
    if (!run) return Promise.resolve();
    for (const dispose of run.cleanups) { try { dispose(); } catch { /* Continue releasing every resource. */ } }
    run.cleanups.clear();
    return this.onStop(run);
  }
}
