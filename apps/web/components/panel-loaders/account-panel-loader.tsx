"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type AccountPanelProps = ComponentProps<
  (typeof import("@/components/settings/account-panel"))["AccountPanel"]
>;

const DynamicAccountPanel = dynamic<AccountPanelProps>(
  () => import("@/components/settings/account-panel").then((mod) => mod.AccountPanel),
  { loading: () => <PanelSkeleton className="min-h-[18rem]" lines={4} /> },
);

export function AccountPanel(props: AccountPanelProps) {
  return <DynamicAccountPanel {...props} />;
}
