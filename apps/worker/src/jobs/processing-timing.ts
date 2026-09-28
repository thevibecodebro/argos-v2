export type ProcessingStage = "download" | "normalize" | "chunk" | "transcribe" | "profile" | "score" | "persist";

type ProcessingEvent = Record<string, string | number>;

export function createProcessingTimer(input: {
  attemptCount: number;
  callId: string;
  generation: number;
  jobId: string;
  emit: (event: ProcessingEvent) => void;
}) {
  const report = (event: ProcessingEvent) => {
    // A logging failure must never change the outcome of recording processing.
    try { input.emit(event); } catch { /* best-effort telemetry */ }
  };

  return {
    async measure<T>(stage: ProcessingStage, task: () => Promise<T>): Promise<T> {
      const startedAt = new Date();
      const startedMs = performance.now();
      const context = {
        attemptCount: input.attemptCount,
        callId: input.callId,
        generation: input.generation,
        jobId: input.jobId,
        stage,
        startedAt: startedAt.toISOString(),
      };
      report({ event: "call_processing.stage_started", ...context });
      try {
        const result = await task();
        report({
          event: "call_processing.stage_completed",
          ...context,
          completedAt: new Date().toISOString(),
          elapsedMs: Math.max(0, Math.round(performance.now() - startedMs)),
        });
        return result;
      } catch (error) {
        report({
          event: "call_processing.stage_failed",
          ...context,
          completedAt: new Date().toISOString(),
          elapsedMs: Math.max(0, Math.round(performance.now() - startedMs)),
        });
        throw error;
      }
    },
  };
}
