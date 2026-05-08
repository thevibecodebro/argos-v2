"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type PermissionsPanelProps = ComponentProps<
  (typeof import("@/components/settings/permissions-panel"))["PermissionsPanel"]
>;

const DynamicPermissionsPanel = dynamic<PermissionsPanelProps>(
  () => import("@/components/settings/permissions-panel").then((mod) => mod.PermissionsPanel),
  { loading: () => <PanelSkeleton className="min-h-[24rem]" lines={6} /> },
);

export function PermissionsPanel(props: PermissionsPanelProps) {
  return <DynamicPermissionsPanel {...props} />;
}
