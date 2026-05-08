"use client";

import type { ReactNode } from "react";
import { SecondaryRail } from "../secondary-rail";

type TrainingCourseShellProps = {
  mode: "learner" | "manager";
  stage: ReactNode;
  structureRail: ReactNode;
};

export function TrainingCourseShell({
  mode,
  stage,
  structureRail,
}: TrainingCourseShellProps) {
  const isManager = mode === "manager";

  if (isManager) {
    return (
      <div
        className="grid min-w-0 gap-3"
        data-training-builder-workbench=""
        data-training-course-shell={mode}
      >
        <SecondaryRail
          description="Choose the module to edit, assign, or review."
          eyebrow="Curriculum"
          railId="training-builder"
          title="Modules"
          data-training-builder-secondary-rail=""
        >
          {structureRail}
        </SecondaryRail>

        <main className="min-w-0 space-y-3" data-forge-workspace-main="true">
          <div data-training-course-stage="">
            {stage}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-training-course-shell={mode}>
      <div data-training-course-structure="inline">
        {structureRail}
      </div>
      <div data-training-course-stage="">
        {stage}
      </div>
    </div>
  );
}
