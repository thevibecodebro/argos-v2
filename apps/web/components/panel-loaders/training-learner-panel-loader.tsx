"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type TrainingLearnerPanelProps = ComponentProps<
  (typeof import("@/components/training-panel"))["TrainingLearnerPanel"]
>;

const DynamicTrainingLearnerPanel = dynamic<TrainingLearnerPanelProps>(
  () => import("@/components/training-panel").then((mod) => mod.TrainingLearnerPanel),
  { loading: () => <PanelSkeleton className="min-h-[40rem]" lines={9} /> },
);

export function TrainingLearnerPanel(props: TrainingLearnerPanelProps) {
  return <DynamicTrainingLearnerPanel {...props} />;
}
