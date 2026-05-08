"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type PeoplePanelProps = ComponentProps<
  (typeof import("@/components/settings/people-panel"))["PeoplePanel"]
>;

const DynamicPeoplePanel = dynamic<PeoplePanelProps>(
  () => import("@/components/settings/people-panel").then((mod) => mod.PeoplePanel),
  { loading: () => <PanelSkeleton className="min-h-[26rem]" lines={6} /> },
);

export function PeoplePanel(props: PeoplePanelProps) {
  return <DynamicPeoplePanel {...props} />;
}
