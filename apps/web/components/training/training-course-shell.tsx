"use client";

import type { ReactNode } from "react";
import { ForgeWorkspaceLayout, ForgeWorkspaceRail } from "../forge";
import { OperationalPreviewDrawer } from "../operational-workspace";

type TrainingCourseShellProps = {
  adminRail?: ReactNode;
  mode: "learner" | "manager";
  stage: ReactNode;
  structureRail: ReactNode;
};

export function TrainingCourseShell({
  adminRail,
  mode,
  stage,
  structureRail,
}: TrainingCourseShellProps) {
  const isManager = mode === "manager";

  if (isManager) {
    return (
      <div
        className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]"
        data-training-builder-workbench=""
        data-training-course-shell={mode}
      >
        <main className="min-w-0 space-y-3" data-forge-workspace-main="true">
          <section
            aria-label="Curriculum map"
            className="rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.026)] p-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.04)]"
            data-training-course-structure=""
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[var(--forge-gold)]">
                  Course structure
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
                  Curriculum map
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-5 text-[var(--forge-muted)]">
                Select a module to review lessons, quiz material, and assignment readiness.
              </p>
            </div>
            <div className="mt-3">
              {structureRail}
            </div>
          </section>

          <div data-training-course-stage="">
            {stage}
          </div>
        </main>

        {adminRail ? (
          <OperationalPreviewDrawer
            className="xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto"
            description="Create, edit, assign, or draft training from the selected module."
            eyebrow="Admin controls"
            title="Builder controls"
            data-training-admin-drawer=""
          >
            {adminRail}
          </OperationalPreviewDrawer>
        ) : null}
      </div>
    );
  }

  const rails = [
    <ForgeWorkspaceRail
      description="Move through assigned modules and complete the current lesson."
      eyebrow="Course structure"
      key="structure"
      title="Curriculum map"
      data-training-course-structure=""
    >
      {structureRail}
    </ForgeWorkspaceRail>,
  ];

  return (
    <div data-training-course-shell={mode}>
      <ForgeWorkspaceLayout railCount={1} rails={rails}>
        <div data-training-course-stage="">
          {stage}
        </div>
      </ForgeWorkspaceLayout>
    </div>
  );
}
