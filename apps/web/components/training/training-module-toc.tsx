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
      className="rounded-[1.5rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.24)]"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Curriculum map</p>
      <div className="mt-4 space-y-2">
        {modules.map((module, index) => (
          <button
            aria-current={module.id === selectedModuleId ? "page" : undefined}
            className={
              module.id === selectedModuleId
                ? "w-full rounded-[1.15rem] border border-[#74b1ff]/20 bg-[#74b1ff]/8 px-4 py-4 text-left"
                : "w-full rounded-[1.15rem] border border-[#45484f]/10 bg-[#161a21]/45 px-4 py-4 text-left transition hover:border-[#74b1ff]/25"
            }
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            type="button"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#74b1ff]">
              Module {index + 1}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{module.title}</p>
            <p className="mt-2 text-xs text-[#a9abb3]">{module.progress?.status ?? "assigned"}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
