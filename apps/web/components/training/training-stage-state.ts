import type { TrainingModuleSummary } from "@/lib/training/service";

export type TrainingStageView = "lesson" | "quiz";

export function resolveTrainingStageView(requested: TrainingStageView, hasQuiz: boolean) {
  return requested === "quiz" && !hasQuiz ? "lesson" : requested;
}

export function getTrainingStagePrimaryAction(input: {
  canManage: boolean;
  hasQuiz: boolean;
  progress: TrainingModuleSummary["progress"];
  stageView: TrainingStageView;
}) {
  if (input.canManage) {
    return { label: "Review module", nextView: input.stageView };
  }

  if (!input.hasQuiz) {
    return { label: "Resume lesson", nextView: "lesson" as const };
  }

  if (input.progress?.status === "passed" || input.progress?.status === "failed") {
    return { label: "Review answers", nextView: "quiz" as const };
  }

  if (input.progress?.status === "in_progress") {
    return { label: "Open quiz", nextView: "quiz" as const };
  }

  return { label: "Resume lesson", nextView: "lesson" as const };
}
