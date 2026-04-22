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
    <section className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.24)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Team pulse</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{selectedModuleHeading}</h3>
          <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
            Keep planning compact at rest, then open focused overlays when it is time to author, assign, or draft.
          </p>
        </div>

        <div className="rounded-xl border border-[#45484f]/10 bg-[#161a21]/55 px-4 py-3 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Planning summary</p>
          <p className="mt-1 text-sm text-[#ecedf6]">
            {moduleCount} module{moduleCount === 1 ? "" : "s"} across {repCount} rep{repCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-[#a9abb3]">{selectedModuleSummary}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isBusy}
          onClick={onCreate}
          type="button"
        >
          Create module
        </button>
        <button
          className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSelectedModule || isBusy}
          onClick={onEdit}
          type="button"
        >
          Edit selected module
        </button>
        <button
          className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/70 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSelectedModule || isBusy}
          onClick={onAssign}
          type="button"
        >
          Assign selected module
        </button>
        <button
          aria-describedby={!aiAvailable ? "training-ai-unavailable" : undefined}
          className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-3 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!aiAvailable || isBusy}
          onClick={onGenerate}
          type="button"
        >
          Generate with AI
        </button>
      </div>

      {!aiAvailable ? (
        <p className="mt-4 text-xs text-[#a9abb3]" id="training-ai-unavailable">
          AI curriculum generation is unavailable until OpenAI is configured.
        </p>
      ) : null}

      {feedback}
    </section>
  );
}
