"use client";

import type { ReactNode } from "react";
import { ForgeWorkspaceLayout, ForgeWorkspaceRail } from "../forge";

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
  const rails = isManager
    ? [
        <ForgeWorkspaceRail
          collapsible
          description="Create, edit, assign, or draft training from the selected module."
          eyebrow="Admin controls"
          key="admin"
          title="Builder controls"
          data-training-admin-rail=""
        >
          {adminRail}
        </ForgeWorkspaceRail>,
        <ForgeWorkspaceRail
          description="Select a module to review lessons, quiz material, and assignment readiness."
          eyebrow="Course structure"
          key="structure"
          title="Curriculum map"
          data-training-course-structure=""
        >
          {structureRail}
        </ForgeWorkspaceRail>,
      ]
    : [
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
      <ForgeWorkspaceLayout railCount={isManager ? 2 : 1} rails={rails}>
        <div data-training-course-stage="">
          {stage}
        </div>
      </ForgeWorkspaceLayout>
    </div>
  );
}
