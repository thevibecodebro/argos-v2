"use client";

import dynamic from "next/dynamic";
import { PanelSkeleton } from "./panel-skeleton";

type UploadCallPanelProps = Record<string, never>;

const DynamicUploadCallPanel = dynamic<UploadCallPanelProps>(
  () => import("@/components/upload-call-panel").then((mod) => mod.UploadCallPanel),
  { loading: () => <PanelSkeleton className="min-h-[26rem]" lines={4} /> },
);

export function UploadCallPanel(props: UploadCallPanelProps) {
  return <DynamicUploadCallPanel {...props} />;
}
