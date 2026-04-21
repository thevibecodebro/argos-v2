import type { TrainingModuleSummary } from "@/lib/training/service";

export type TrainingStageView = "lesson" | "quiz";
export type TrainingStagePrimaryActionKind = "assign" | "complete" | "view";

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
    return { kind: "assign" as const, label: "Plan assignments", nextView: input.stageView };
  }

  if (!input.hasQuiz) {
    if (input.progress?.status === "passed") {
      return { kind: "view" as const, label: "Review lesson", nextView: "lesson" as const };
    }

    return { kind: "complete" as const, label: "Mark complete", nextView: "lesson" as const };
  }

  if (input.progress?.status === "passed" || input.progress?.status === "failed") {
    return { kind: "view" as const, label: "Review answers", nextView: "quiz" as const };
  }

  if (input.progress?.status === "in_progress") {
    return { kind: "view" as const, label: "Open quiz", nextView: "quiz" as const };
  }

  return { kind: "view" as const, label: "Resume lesson", nextView: "lesson" as const };
}
