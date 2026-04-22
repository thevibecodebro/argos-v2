import type { TrainingTeamProgressShell } from "@/lib/training/service";

type GetTrainingManagerStageMetricsInput = {
  now?: Date | string;
  repProgress: TrainingTeamProgressShell["repProgress"];
  selectedModuleId: string | null;
};

export type TrainingManagerStageMetrics = {
  assignedCount: number;
  completionRate: number;
  dueSoonCount: number;
};

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getTrainingManagerStageMetrics({
  now = new Date(),
  repProgress,
  selectedModuleId,
}: GetTrainingManagerStageMetricsInput): TrainingManagerStageMetrics {
  if (!selectedModuleId) {
    return {
      assignedCount: 0,
      completionRate: 0,
      dueSoonCount: 0,
    };
  }

  const referenceTime = toDate(now) ?? new Date();
  const dueSoonThreshold = referenceTime.getTime() + THREE_DAYS_IN_MS;
  const selectedEntries = repProgress.flatMap((rep) =>
    rep.moduleProgress.filter((entry) => entry.moduleId === selectedModuleId),
  );

  const assignedCount = selectedEntries.length;
  const completedCount = selectedEntries.filter((entry) => entry.status === "passed").length;
  const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
  const dueSoonCount = selectedEntries.filter((entry) => {
    if (entry.status === "passed") {
      return false;
    }

    const dueDate = toDate(entry.dueDate);
    if (!dueDate) {
      return false;
    }

    const dueTime = dueDate.getTime();
    return dueTime >= referenceTime.getTime() && dueTime <= dueSoonThreshold;
  }).length;

  return {
    assignedCount,
    completionRate,
    dueSoonCount,
  };
}
