import React, { type ReactNode } from "react";
import { ForgeEmptyState, ForgeSurface } from "./forge";
import { PageFrame } from "./page-frame";

type FeaturePlaceholderProps = {
  actions?: Array<{ href: string; label: string }>;
  body?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  tone?: "default" | "warning";
};

export function FeaturePlaceholder({
  actions,
  body,
  description,
  eyebrow = "Preview",
  title,
  tone,
}: FeaturePlaceholderProps) {
  return (
    <PageFrame
      actions={actions}
      description={description}
      eyebrow={eyebrow}
      title={title}
      tone={tone}
    >
      <ForgeSurface className="p-6" variant="panel">
        {body ?? (
          <ForgeEmptyState
            description="This route is wired into the authenticated product shell and ready for its next product slice."
            icon="lightbulb"
            title="Feature polish is coming next"
          />
        )}
      </ForgeSurface>
    </PageFrame>
  );
}
