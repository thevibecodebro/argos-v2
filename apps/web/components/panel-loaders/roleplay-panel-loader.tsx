"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type RoleplayPanelProps = ComponentProps<
  (typeof import("@/components/roleplay-panel"))["RoleplayPanel"]
>;

const DynamicRoleplayPanel = dynamic<RoleplayPanelProps>(
  () => import("@/components/roleplay-panel").then((mod) => mod.RoleplayPanel),
  { loading: () => <PanelSkeleton className="min-h-[36rem]" lines={8} /> },
);

export function RoleplayPanel(props: RoleplayPanelProps) {
  return <DynamicRoleplayPanel {...props} />;
}
