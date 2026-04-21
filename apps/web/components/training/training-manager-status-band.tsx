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
          className="rounded-[1.25rem] border border-[#45484f]/12 bg-[#161a21]/60 px-4 py-4"
          key={item.label}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a9abb3]">{item.label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{item.value}</p>
          <p className="mt-1 text-xs leading-5 text-[#a9abb3]">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
