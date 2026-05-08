"use client";

import dynamic from "next/dynamic";

type FeedbackDialogLoaderProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const DynamicFeedbackDialog = dynamic<FeedbackDialogLoaderProps>(
  () => import("./feedback-widget").then((mod) => mod.FeedbackDialog),
  { loading: () => null },
);

export function FeedbackDialogLoader(props: FeedbackDialogLoaderProps) {
  return <DynamicFeedbackDialog {...props} />;
}
