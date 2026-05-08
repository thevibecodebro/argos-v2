"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type IntegrationsPanelProps = ComponentProps<
  (typeof import("@/components/settings/integrations-panel"))["IntegrationsPanel"]
>;

const DynamicIntegrationsPanel = dynamic<IntegrationsPanelProps>(
  () => import("@/components/settings/integrations-panel").then((mod) => mod.IntegrationsPanel),
  { loading: () => <PanelSkeleton className="min-h-[20rem]" lines={5} /> },
);

export function IntegrationsPanel(props: IntegrationsPanelProps) {
  return <DynamicIntegrationsPanel {...props} />;
}
