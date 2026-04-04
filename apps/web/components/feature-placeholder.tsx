import React, { type ReactNode } from "react";
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
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        {body ?? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-5 py-8 text-center">
            <p className="text-lg font-medium text-slate-200">Feature polish is coming next</p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              This route is wired into the authenticated product shell and ready for its next product slice.
            </p>
          </div>
        )}
      </section>
    </PageFrame>
  );
}
