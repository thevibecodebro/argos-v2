"use client";

import type { ReactNode } from "react";
import { ForgeWorkspaceRailAction, ForgeWorkspaceRailGroup } from "../forge";

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
    <div data-training-admin-controls="true">
      <nav aria-label="Training admin controls" className="space-y-5" data-settings-nav-theme="forge">
        <ForgeWorkspaceRailGroup label="Selection">
          <div className="rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 py-3">
            <p className="text-sm font-semibold text-[var(--forge-text)]">{selectedModuleHeading}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">{selectedModuleSummary}</p>
          </div>
        </ForgeWorkspaceRailGroup>

        <ForgeWorkspaceRailGroup label="Builder controls">
          <ForgeWorkspaceRailAction icon="add" disabled={isBusy} onClick={onCreate} type="button">
            Create module
          </ForgeWorkspaceRailAction>
          <ForgeWorkspaceRailAction
            disabled={!hasSelectedModule || isBusy}
            icon="edit_note"
            onClick={onEdit}
            type="button"
          >
            Edit selected module
          </ForgeWorkspaceRailAction>
          <ForgeWorkspaceRailAction
            disabled={!hasSelectedModule || isBusy}
            icon="group"
            onClick={onAssign}
            type="button"
          >
            Assign selected module
          </ForgeWorkspaceRailAction>
          <ForgeWorkspaceRailAction
            active={aiAvailable}
            aria-describedby={!aiAvailable ? "training-ai-unavailable" : undefined}
            disabled={!aiAvailable || isBusy}
            icon="auto_awesome"
            onClick={onGenerate}
            type="button"
          >
            Generate with AI
          </ForgeWorkspaceRailAction>
        </ForgeWorkspaceRailGroup>

        <ForgeWorkspaceRailGroup label="Planning summary">
          <div className="rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 py-3">
            <p className="text-sm font-semibold text-[var(--forge-text)]">
              {moduleCount} module{moduleCount === 1 ? "" : "s"} across {repCount} rep{repCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">{selectedModuleSummary}</p>
          </div>
        </ForgeWorkspaceRailGroup>

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
    </div>
  );
}
