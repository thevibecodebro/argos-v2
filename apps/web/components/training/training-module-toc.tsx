"use client";

import type { TrainingModuleSummary } from "@/lib/training/service";

export function TrainingModuleToc({
  modules,
  selectedModuleId,
  onSelectModule,
}: {
  modules: TrainingModuleSummary[];
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
}) {
  return (
    <section
      aria-label="Curriculum map"
      data-training-module-tree=""
      className="rounded-[1.5rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.24)]"
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
      <div className="mt-5 divide-y divide-white/6 overflow-hidden rounded-[1.15rem] border border-white/8 bg-white/[0.03]">
        {modules.map((module) => (
          <button
            aria-current={module.id === selectedModuleId ? "page" : undefined}
            className={
              module.id === selectedModuleId
                ? "w-full bg-[var(--forge-gold)]/10 px-4 py-3.5 text-left transition"
                : "w-full px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
            }
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{module.title}</p>
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
