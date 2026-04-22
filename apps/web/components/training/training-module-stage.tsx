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
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-sm text-[#a9abb3]">No module selected.</p>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(116,177,255,0.16),transparent_30%),linear-gradient(180deg,rgba(16,19,26,0.98),rgba(10,13,19,0.96))] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.32)] sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_24%,transparent_72%,rgba(255,255,255,0.02))]" />
      <div className="relative space-y-5">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Current curriculum</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-white">{selectedModule.title}</h2>
            <p className="max-w-3xl text-sm leading-7 text-[#a9abb3]">{selectedModule.description}</p>
          </div>
          <div className="rounded-full border border-[#45484f]/15 bg-[#161a21]/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a9abb3]">
            {selectedModule.skillCategory}
          </div>
        </div>

        {stageBand}

        <div
          aria-label="Training module stage"
          className="inline-flex rounded-full border border-[#45484f]/15 bg-[#161a21]/70 p-1"
          role="tablist"
        >
          <button
            aria-controls="training-stage-panel-lesson"
            aria-selected={stageView === "lesson"}
            className={
              stageView === "lesson"
                ? "rounded-full bg-[#74b1ff]/12 px-4 py-2 text-xs font-semibold text-[#74b1ff]"
                : "px-4 py-2 text-xs font-semibold text-[#a9abb3]"
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
                  ? "rounded-full bg-[#74b1ff]/12 px-4 py-2 text-xs font-semibold text-[#74b1ff]"
                  : "px-4 py-2 text-xs font-semibold text-[#a9abb3]"
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
          className="rounded-[1.25rem] border border-[#45484f]/10 bg-[#161a21]/45 p-5"
          id={`training-stage-panel-${stageView}`}
          role="tabpanel"
        >
          {stageView === "lesson" ? (
            <div className="space-y-3">
              <p className="text-sm leading-7 text-[#ecedf6]">{selectedModule.description}</p>
              <p className="text-xs text-[#a9abb3]">
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
          <div className="rounded-xl border border-[#74b1ff]/20 bg-[#74b1ff]/8 px-4 py-3 text-sm text-[#ecedf6]">
            {statusMessage}
          </div>
        ) : null}

        <button
          className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-5 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
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
