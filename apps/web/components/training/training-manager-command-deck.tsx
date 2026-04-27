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

  return (
    <section className="rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-gold)]">Builder controls</p>
        <h3 className="mt-2 text-lg font-semibold text-white">{selectedModuleHeading}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">
          Create, edit, assign, or draft training from the selected module.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface-2)]/55 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">Planning summary</p>
        <p className="mt-1 text-sm text-[var(--forge-text)]">
          {moduleCount} module{moduleCount === 1 ? "" : "s"} across {repCount} rep{repCount === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-xs text-[var(--forge-muted)]">{selectedModuleSummary}</p>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isBusy}
          onClick={onCreate}
          type="button"
        >
          Create module
        </button>
        <button
          className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSelectedModule || isBusy}
          onClick={onEdit}
          type="button"
        >
          Edit selected module
        </button>
        <button
          className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/70 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSelectedModule || isBusy}
          onClick={onAssign}
          type="button"
        >
          Assign selected module
        </button>
        <button
          aria-describedby={!aiAvailable ? "training-ai-unavailable" : undefined}
          className="rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-4 py-3 text-left text-sm font-semibold text-[#170d07] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!aiAvailable || isBusy}
          onClick={onGenerate}
          type="button"
        >
          Generate with AI
        </button>
      </div>

      {!aiAvailable ? (
        <p className="mt-4 text-xs text-[var(--forge-muted)]" id="training-ai-unavailable">
          AI curriculum generation is unavailable until OpenAI is configured.
        </p>
      ) : null}

      {feedback}
    </section>
  );
}
