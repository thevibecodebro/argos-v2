"use client";

import type { ReactNode } from "react";
import type { TrainingModuleSummary } from "@/lib/training/service";

type TrainingCourseShellProps = {
  managerActions?: ReactNode;
  modulesRail: ReactNode;
  primaryContent: ReactNode;
  selectedModule: TrainingModuleSummary | null;
};

export function TrainingCourseShell({
  managerActions,
  modulesRail,
  primaryContent,
  selectedModule,
}: TrainingCourseShellProps) {
  const selectedTitle = selectedModule?.title ?? "Select a module";
  const selectedDescription =
    selectedModule?.description?.trim() ||
    "Choose a module from the rail to review the curriculum, lesson notes, and quiz.";

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)] sm:p-7">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">
          Current curriculum
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">{selectedTitle}</h2>
            <p className="max-w-3xl text-sm leading-7 text-[#a9abb3]">{selectedDescription}</p>
          </div>
          {selectedModule?.skillCategory ? (
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
              {selectedModule.skillCategory}
            </p>
          ) : null}
        </div>
      </section>

      {managerActions ? <div>{managerActions}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="self-start rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          {modulesRail}
        </aside>

        <main className="min-w-0 space-y-5">{primaryContent}</main>
      </div>
    </div>
  );
}
