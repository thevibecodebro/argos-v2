"use client";

import { SecondaryRailButton, SecondaryRailGroup } from "@/components/secondary-rail";
import type { TrainingModuleSummary } from "@/lib/training/service";

export function TrainingModuleToc({
  modules,
  selectedModuleId,
  onSelectModule,
  variant = "panel",
}: {
  modules: TrainingModuleSummary[];
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  variant?: "panel" | "rail";
}) {
  if (variant === "rail") {
    return (
      <div aria-label="Curriculum map" data-training-module-tree="rail">
        <SecondaryRailGroup label="Curriculum">
          {modules.map((module) => (
            <SecondaryRailButton
              active={module.id === selectedModuleId}
              description={`${module.skillCategory} · ${module.progress?.status ?? "assigned"}`}
              icon={module.hasQuiz ? "task_alt" : "subject"}
              key={module.id}
              label={module.title}
              onClick={() => onSelectModule(module.id)}
            />
          ))}
          {!modules.length ? (
            <p className="px-3 text-xs leading-5 text-[var(--forge-muted)]">
              Create a module to populate the builder rail.
            </p>
          ) : null}
        </SecondaryRailGroup>
      </div>
    );
  }

  return (
    <section
      aria-label="Curriculum map"
      data-training-module-tree=""
      className="rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-panel-bg)] p-6 shadow-[0_18px_60px_color-mix(in_srgb,var(--forge-bg)_10%,transparent)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-gold)]">Course structure</p>
          <p className="mt-1 text-xs text-[var(--forge-muted)]">Curriculum map</p>
        </div>
        <span className="rounded-full border border-[var(--forge-border-strong)]/12 bg-[var(--forge-surface-2)]/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
          {modules.length} module{modules.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-5 divide-y divide-[var(--forge-border)] overflow-hidden rounded-[1.15rem] border border-[var(--forge-border)] bg-[var(--forge-panel-muted-bg)]">
        {modules.map((module) => (
          <button
            aria-current={module.id === selectedModuleId ? "page" : undefined}
            className={
              module.id === selectedModuleId
                ? "w-full bg-[var(--forge-gold)]/10 px-4 py-3.5 text-left transition"
                : "w-full px-4 py-3.5 text-left transition hover:bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)]"
            }
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--forge-text)]">{module.title}</p>
                <p className="mt-1 truncate text-xs text-[var(--forge-muted)]">
                  {module.skillCategory} · {module.progress?.status ?? "assigned"}
                </p>
              </div>
              <span className="text-xs font-semibold text-[var(--forge-gold)]">Open</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
