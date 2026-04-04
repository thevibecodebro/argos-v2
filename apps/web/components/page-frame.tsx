import React from "react";
import Link from "next/link";
import { cn } from "@argos-v2/ui";

type PageAction = {
  href: string;
  label: string;
};

type PageFrameProps = {
  children: React.ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  actions?: PageAction[];
  tone?: "default" | "warning";
};

export function PageFrame({
  actions,
  children,
  description,
  eyebrow,
  title,
  tone = "default",
}: PageFrameProps) {
  return (
    <div className="space-y-5">
      <section
        className={cn(
          "rounded-[1.75rem] border p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)] sm:p-7",
          tone === "warning"
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-slate-800/70 bg-[#0c1629]",
        )}
      >
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-400">{description}</p>
          </div>

          {actions?.length ? (
            <div className="flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link
                  className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25"
                  href={action.href}
                  key={action.href}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {children}
    </div>
  );
}
