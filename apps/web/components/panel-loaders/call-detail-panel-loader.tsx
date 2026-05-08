"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type CallDetailPanelProps = ComponentProps<
  (typeof import("@/components/call-detail-panel"))["CallDetailPanel"]
>;

const DynamicCallDetailPanel = dynamic<CallDetailPanelProps>(
  () => import("@/components/call-detail-panel").then((mod) => mod.CallDetailPanel),
  { loading: () => <PanelSkeleton className="min-h-[34rem]" lines={8} /> },
);

export function CallDetailPanel(props: CallDetailPanelProps) {
  return <DynamicCallDetailPanel {...props} />;
}
