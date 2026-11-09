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
        <div className="min-w-0 space-y-2">
          <h2 className="break-words text-xl font-semibold text-[var(--forge-text)] sm:text-2xl">{selectedModule.title}</h2>
          <p className="text-xs text-[var(--forge-muted)]">{selectedModule.skillCategory}{canManage ? " · Module preview" : ""}</p>
          {!canManage ? (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--forge-muted)]" data-training-lesson-progress="true">
              <span>{selectedModule.progress?.status === "passed" ? "Completed" : selectedModule.progress?.status === "failed" ? "Try again" : selectedModule.progress?.status === "in_progress" ? "In progress" : "Assigned"}</span>
              {selectedModule.progress?.score != null ? <span>Quiz score {selectedModule.progress.score}%</span> : null}
              {selectedModule.progress?.dueDate ? <span>Due {new Intl.DateTimeFormat("en-US", {dateStyle:"medium",timeZone:"UTC"}).format(new Date(selectedModule.progress.dueDate))}</span> : null}
            </p>
          ) : null}
        </div>

        <div
          aria-label="Training module stage"
          onKeyDown={handleTabKeyDown}
          className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-[var(--forge-surface-2)] p-1"
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

        {canManage || stageView === "lesson" ? <button
          className="min-h-11 w-full rounded-lg bg-[var(--forge-gold)] px-5 py-3 sm:w-auto text-sm font-semibold text-[var(--forge-on-accent)] transition hover:brightness-110 disabled:opacity-50"
          disabled={primaryActionDisabled}
          onClick={onPrimaryAction}
          type="button"
        >
          {primaryAction}
        </button> : null}
        {stageBand ? (
          <details className="border-t border-[var(--forge-border)] pt-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[var(--forge-text)]">Assignment progress</summary>
            {stageBand}
          </details>
        ) : null}
      </div>
    </section>
  );
}
