"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { TrainingModuleSummary } from "@/lib/training/service";
import type { TrainingStageView } from "./training-stage-state";

export function TrainingModuleStage({
  canManage,
  selectedModule,
  stageView,
  stageBand,
  statusMessage,
  onSelectView,
  primaryAction,
  primaryActionDisabled,
  onPrimaryAction,
  quizContent,
}: {
  canManage: boolean;
  selectedModule: TrainingModuleSummary | null;
  stageView: TrainingStageView;
  stageBand?: ReactNode;
  statusMessage?: string | null;
  onSelectView: (view: TrainingStageView) => void;
  primaryAction: string;
  primaryActionDisabled?: boolean;
  onPrimaryAction: () => void;
  quizContent: ReactNode;
}) {
  if (!selectedModule) {
    return (
      <section aria-label={canManage ? "Module preview" : "Course player"} className="training-lesson">
        <p className="text-sm text-[var(--forge-muted)]">No module selected.</p>
      </section>
    );
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selectedModule?.hasQuiz || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "lesson" : event.key === "End" ? "quiz" : stageView === "lesson" ? "quiz" : "lesson";
    onSelectView(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#training-stage-tab-${next}`)?.focus();
  }

  return (
    <section aria-label={canManage ? "Module preview" : "Course player"} className="training-lesson">
      <div className="space-y-5">
        <header className="space-y-2">
          <h2 className="text-xl font-semibold leading-snug text-[var(--forge-text)] sm:text-2xl">{selectedModule.title}</h2>
          <p className="text-sm text-[var(--forge-muted)]">{selectedModule.skillCategory}</p>
        </header>

        {stageBand}

        <div
          aria-label="Training module stage"
          className="training-stage-tabs"
          onKeyDown={handleTabKeyDown}
          role="tablist"
        >
          <button
            aria-controls="training-stage-panel-lesson"
            aria-selected={stageView === "lesson"}
            className={
              stageView === "lesson"
                ? "training-stage-tab training-stage-tab-active"
                : "training-stage-tab"
            }
            id="training-stage-tab-lesson"
            tabIndex={stageView === "lesson" ? 0 : -1}
            onClick={() => onSelectView("lesson")}
            role="tab"
            type="button"
          >
            Lesson
          </button>
          {selectedModule.hasQuiz ? (
            <button
              aria-controls="training-stage-panel-quiz"
              aria-selected={stageView === "quiz"}
              className={
                stageView === "quiz"
                  ? "training-stage-tab training-stage-tab-active"
                  : "training-stage-tab"
              }
              id="training-stage-tab-quiz"
            tabIndex={stageView === "quiz" ? 0 : -1}
              onClick={() => onSelectView("quiz")}
              role="tab"
              type="button"
            >
              Quiz
            </button>
          ) : null}
        </div>

        <div
          aria-labelledby={`training-stage-tab-${stageView}`}
          className="training-lesson-content"
          tabIndex={0}
          id={`training-stage-panel-${stageView}`}
          role="tabpanel"
        >
          {stageView === "lesson" ? (
            <div className="space-y-4">
              <p className="whitespace-pre-line text-base leading-7 text-[var(--forge-text)]">{selectedModule.description}</p>
              <p className="text-xs text-[var(--forge-muted)]">
                {canManage
                  ? "Managers review this module before editing content, drafting quiz material, or assigning it to reps."
                  : selectedModule.hasQuiz
                    ? "Work through the lesson, then open the quiz when you are ready."
                    : "Work through the lesson, then mark the module complete when you are ready."}
              </p>
            </div>
          ) : (
            quizContent
          )}
        </div>

        {statusMessage ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/8 px-4 py-3 text-sm text-[var(--forge-text)]"
            role="status"
          >
            {statusMessage}
          </div>
        ) : null}

        <button
          className="forge-button forge-button-primary min-h-11 w-full rounded-lg px-5 py-3 text-sm font-semibold disabled:opacity-50 sm:w-auto"
          disabled={primaryActionDisabled}
          onClick={onPrimaryAction}
          type="button"
        >
          {primaryAction}
        </button>
      </div>
    </section>
  );
}
