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
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div
          className="py-2"
          key={item.label}
        >
          <p className="text-xs font-medium text-[var(--forge-muted)]">{item.label}</p>
          <p className="forge-tabular-nums mt-1 text-xl font-semibold text-[var(--forge-text)]">{item.value}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
