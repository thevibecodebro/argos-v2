"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type TrainingCurriculumPanelProps = ComponentProps<
  (typeof import("@/components/training-panel"))["TrainingCurriculumPanel"]
>;

const DynamicTrainingCurriculumPanel = dynamic<TrainingCurriculumPanelProps>(
  () => import("@/components/training-panel").then((mod) => mod.TrainingCurriculumPanel),
  { loading: () => <PanelSkeleton className="min-h-[40rem]" lines={9} /> },
);

export function TrainingCurriculumPanel(props: TrainingCurriculumPanelProps) {
  return <DynamicTrainingCurriculumPanel {...props} />;
}
