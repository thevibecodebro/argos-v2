"use client";

import type { ReactNode } from "react";

type TrainingManagerCommandDeckProps = {
  aiAvailable: boolean;
  feedback?: ReactNode;
  hasSelectedModule: boolean;
  isBusy: boolean;
  moduleCount: number;
  repCount: number;
  selectedModuleTitle: string | null;
  onAssign: () => void;
  onCreate: () => void;
  onEdit: () => void;
  onGenerate: () => void;
};

export function TrainingManagerCommandDeck({
  aiAvailable,
  feedback,
  hasSelectedModule,
  isBusy,
  moduleCount,
  repCount,
  selectedModuleTitle,
  onAssign,
  onCreate,
  onEdit,
  onGenerate,
}: TrainingManagerCommandDeckProps) {
  const selectedModuleHeading = hasSelectedModule
    ? selectedModuleTitle || "Selected module"
    : "Select a module to open the planning deck";
  const selectedModuleSummary = hasSelectedModule
    ? selectedModuleTitle
      ? `Focused on ${selectedModuleTitle}.`
      : "Focused on the selected module."
    : "Choose a module to edit or assign it.";
  const navButtonClass =
    "forge-nav-link flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-[var(--font-display)] text-[0.7rem] font-bold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <section className="rounded-[1.35rem] border border-[var(--forge-border)] bg-[rgba(5,4,3,0.56)] p-4 shadow-[inset_0_1px_0_rgba(255,244,230,0.055)]">
      <div className="mb-5 rounded-[1.15rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] p-4">
        <p className="forge-page-eyebrow">Admin controls</p>
        <h3 className="mt-2 text-base font-semibold text-[var(--forge-text)]">{selectedModuleHeading}</h3>
        <p className="mt-2 text-xs leading-5 text-[var(--forge-muted)]">{selectedModuleSummary}</p>
      </div>

      <nav aria-label="Training admin controls" className="space-y-5" data-settings-nav-theme="forge">
        <div>
          <p className="forge-nav-section-label mb-2 px-3">Builder controls</p>
          <div className="space-y-1">
            <button className={navButtonClass} disabled={isBusy} onClick={onCreate} type="button">
              <span className="material-symbols-outlined forge-icon shrink-0" style={{ fontSize: "18px" }}>
                add_circle
              </span>
              <span className="truncate">Create module</span>
            </button>
            <button
              className={navButtonClass}
              disabled={!hasSelectedModule || isBusy}
              onClick={onEdit}
              type="button"
            >
              <span className="material-symbols-outlined forge-icon shrink-0" style={{ fontSize: "18px" }}>
                edit_square
              </span>
              <span className="truncate">Edit selected module</span>
            </button>
            <button
              className={navButtonClass}
              disabled={!hasSelectedModule || isBusy}
              onClick={onAssign}
              type="button"
            >
              <span className="material-symbols-outlined forge-icon shrink-0" style={{ fontSize: "18px" }}>
                assignment_ind
              </span>
              <span className="truncate">Assign selected module</span>
            </button>
            <button
              aria-describedby={!aiAvailable ? "training-ai-unavailable" : undefined}
              className={`${navButtonClass} ${aiAvailable ? "forge-nav-link--active" : ""}`}
              disabled={!aiAvailable || isBusy}
              onClick={onGenerate}
              type="button"
            >
              <span className="material-symbols-outlined forge-icon shrink-0" style={{ fontSize: "18px" }}>
                auto_awesome
              </span>
              <span className="truncate">Generate with AI</span>
            </button>
          </div>
        </div>

        <div>
          <p className="forge-nav-section-label mb-2 px-3">Planning summary</p>
          <div className="rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 py-3">
            <p className="text-sm font-semibold text-[var(--forge-text)]">
              {moduleCount} module{moduleCount === 1 ? "" : "s"} across {repCount} rep{repCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">{selectedModuleSummary}</p>
          </div>
        </div>

        {!aiAvailable ? (
          <p className="px-3 text-xs leading-5 text-[var(--forge-muted)]" id="training-ai-unavailable">
            AI curriculum generation is unavailable until OpenAI is configured.
          </p>
        ) : null}
      </nav>

      {feedback ? (
        <div className="mt-5">
          {feedback}
        </div>
      ) : null}
    </section>
  );
}
