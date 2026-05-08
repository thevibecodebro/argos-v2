"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type CompliancePanelProps = ComponentProps<
  (typeof import("@/components/settings/compliance-panel"))["CompliancePanel"]
>;

const DynamicCompliancePanel = dynamic<CompliancePanelProps>(
  () => import("@/components/settings/compliance-panel").then((mod) => mod.CompliancePanel),
  { loading: () => <PanelSkeleton className="min-h-[18rem]" lines={4} /> },
);

export function CompliancePanel(props: CompliancePanelProps) {
  return <DynamicCompliancePanel {...props} />;
}
