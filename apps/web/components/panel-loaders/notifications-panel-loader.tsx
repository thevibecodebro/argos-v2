"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { PanelSkeleton } from "./panel-skeleton";

type NotificationsPanelProps = ComponentProps<
  (typeof import("@/components/notifications-panel"))["NotificationsPanel"]
>;

const DynamicNotificationsPanel = dynamic<NotificationsPanelProps>(
  () => import("@/components/notifications-panel").then((mod) => mod.NotificationsPanel),
  { loading: () => <PanelSkeleton className="min-h-[22rem]" lines={5} /> },
);

export function NotificationsPanel(props: NotificationsPanelProps) {
  return <DynamicNotificationsPanel {...props} />;
}
