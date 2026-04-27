import React from "react";
import { cn } from "@argos-v2/ui";
import { ForgeButton } from "./forge";

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
  headerMode?: "default" | "hidden";
};

export function PageFrame({
  actions,
  children,
  description,
  eyebrow,
  title,
  tone = "default",
  headerMode = "default",
}: PageFrameProps) {
  const actionLinks = actions?.length ? (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <ForgeButton
          href={action.href}
          key={action.href}
          variant="secondary"
        >
          {action.label}
        </ForgeButton>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-5">
      {headerMode === "default" ? (
        <section
          data-page-header="forge"
          className={cn(
            "forge-page-header p-6 sm:p-7",
            tone === "warning" && "forge-page-header--warning",
          )}
        >
          {eyebrow ? (
            <p className="forge-page-eyebrow">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="forge-page-title text-2xl font-semibold">{title}</h2>
              <p className="forge-page-description max-w-2xl text-sm leading-7">{description}</p>
            </div>
            {actionLinks}
          </div>
        </section>
      ) : actionLinks ? (
        <div className="flex justify-end">{actionLinks}</div>
      ) : null}

      {children}
    </div>
  );
}
