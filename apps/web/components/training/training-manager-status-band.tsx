"use client";

import type { TrainingManagerStageMetrics } from "./training-manager-stage-metrics";

type TrainingManagerStatusBandProps = {
  metrics: TrainingManagerStageMetrics;
};

export function TrainingManagerStatusBand({ metrics }: TrainingManagerStatusBandProps) {
  const items = [
    {
      label: "Assignment coverage",
      value: metrics.assignedCount,
      detail: "Reps assigned to this module",
    },
    {
      label: "Completion rate",
      value: `${metrics.completionRate}%`,
      detail: "Passed so far for this module",
    },
    {
      label: "Due soon",
      value: metrics.dueSoonCount,
      detail: "Open assignments due in 3 days",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div
          className="rounded-[1.25rem] border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/60 px-4 py-4"
          key={item.label}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--forge-muted)]">{item.label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--forge-text)]">{item.value}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
