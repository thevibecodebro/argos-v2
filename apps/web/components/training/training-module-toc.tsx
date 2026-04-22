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
      className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.24)]"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Curriculum map</p>
      <div className="mt-5 divide-y divide-white/6 overflow-hidden rounded-[1.15rem] border border-white/8 bg-white/[0.03]">
        {modules.map((module) => (
          <button
            aria-current={module.id === selectedModuleId ? "page" : undefined}
            className={
              module.id === selectedModuleId
                ? "w-full bg-[#74b1ff]/10 px-4 py-3.5 text-left transition"
                : "w-full px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
            }
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{module.title}</p>
                <p className="mt-1 text-xs text-[#a9abb3]">{module.progress?.status ?? "assigned"}</p>
              </div>
              <span className="text-xs font-semibold text-[#74b1ff]">Open</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
