"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type TeamsPanelProps = ComponentProps<
  (typeof import("@/components/settings/teams-panel"))["TeamsPanel"]
>;

const DynamicTeamsPanel = dynamic<TeamsPanelProps>(
  () => import("@/components/settings/teams-panel").then((mod) => mod.TeamsPanel),
  { loading: () => <PanelSkeleton className="min-h-[24rem]" lines={6} /> },
);

export function TeamsPanel(props: TeamsPanelProps) {
  return <DynamicTeamsPanel {...props} />;
}
