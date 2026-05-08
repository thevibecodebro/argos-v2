"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type RubricsPanelProps = ComponentProps<
  (typeof import("@/components/settings/rubrics-panel"))["RubricsPanel"]
>;

const DynamicRubricsPanel = dynamic<RubricsPanelProps>(
  () => import("@/components/settings/rubrics-panel").then((mod) => mod.RubricsPanel),
  { loading: () => <PanelSkeleton className="min-h-[28rem]" lines={7} /> },
);

export function RubricsPanel(props: RubricsPanelProps) {
  return <DynamicRubricsPanel {...props} />;
}
