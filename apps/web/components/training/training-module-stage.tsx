"use client";

import type { ReactNode } from "react";
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
      <section className="rounded-[1.75rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-sm text-[var(--forge-muted)]">No module selected.</p>
      </section>
    );
  }

  const workspaceLabel = canManage ? "Course builder" : "Course player";
  const stageLabel = canManage ? "Module editor preview" : "Lesson workspace";

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(32,21,15,0.98),rgba(13,9,7,0.96))] p-6 shadow-[0_24px_80px_rgba(5,3,2,0.32)] sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_24%,transparent_72%,rgba(255,255,255,0.02))]" />
      <div className="relative space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--forge-gold)]">{stageLabel}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--forge-muted)]">
            Training / {workspaceLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-white">{selectedModule.title}</h2>
            <p className="max-w-3xl text-sm leading-7 text-[var(--forge-muted)]">{selectedModule.description}</p>
          </div>
          <div className="rounded-full border border-[var(--forge-border-strong)]/15 bg-[var(--forge-surface-2)]/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--forge-muted)]">
            {selectedModule.skillCategory}
          </div>
        </div>

        {stageBand}

        <div
          aria-label="Training module stage"
          className="inline-flex rounded-full border border-[var(--forge-border-strong)]/15 bg-[var(--forge-surface-2)]/70 p-1"
          role="tablist"
        >
          <button
            aria-controls="training-stage-panel-lesson"
            aria-selected={stageView === "lesson"}
            className={
              stageView === "lesson"
                ? "rounded-full bg-[var(--forge-gold)]/12 px-4 py-2 text-xs font-semibold text-[var(--forge-gold)]"
                : "px-4 py-2 text-xs font-semibold text-[var(--forge-muted)]"
            }
            id="training-stage-tab-lesson"
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
                  ? "rounded-full bg-[var(--forge-gold)]/12 px-4 py-2 text-xs font-semibold text-[var(--forge-gold)]"
                  : "px-4 py-2 text-xs font-semibold text-[var(--forge-muted)]"
              }
              id="training-stage-tab-quiz"
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
          className="rounded-[1.25rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface-2)]/45 p-6"
          id={`training-stage-panel-${stageView}`}
          role="tabpanel"
        >
          {stageView === "lesson" ? (
            <div className="space-y-4">
              <p className="text-sm leading-7 text-[var(--forge-text)]">{selectedModule.description}</p>
              <p className="text-xs text-[var(--forge-muted)]">
                {canManage
                  ? "Managers review the lesson while planning assignments and edits from the command deck."
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
          className="rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-5 py-3 text-sm font-semibold text-[#170d07] transition hover:brightness-110 disabled:opacity-50"
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
