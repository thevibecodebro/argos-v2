import React from "react";
import { cn } from "@argos-v2/ui";
import { ForgeButton, ForgeChip, type ForgeTone } from "./forge";

type PageAction = {
  href: string;
  icon?: string;
  label: string;
};

type PageStatusChip = {
  icon?: string;
  label: string;
  tone?: ForgeTone;
};

type PageFrameProps = {
  children: React.ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  actions?: PageAction[];
  primaryAction?: PageAction;
  secondaryActions?: PageAction[];
  statusChips?: PageStatusChip[];
  workflowSlot?: React.ReactNode;
  tone?: "default" | "warning";
  headerMode?: "default" | "hidden";
};

export function PageFrame({
  actions,
  children,
  description,
  eyebrow,
  primaryAction,
  secondaryActions,
  statusChips,
  title,
  tone = "default",
  headerMode = "default",
  workflowSlot,
}: PageFrameProps) {
  const resolvedSecondaryActions = secondaryActions ?? actions ?? [];
  const hasHeaderTools = Boolean(
    primaryAction ||
      resolvedSecondaryActions.length ||
      statusChips?.length ||
      workflowSlot,
  );

  const actionLinks = resolvedSecondaryActions.length ? (
    <div className="flex flex-wrap gap-3" data-page-secondary-actions="true">
      {resolvedSecondaryActions.map((action) => (
        <ForgeButton
          href={action.href}
          key={action.href}
          icon={action.icon}
          variant="secondary"
        >
          {action.label}
        </ForgeButton>
      ))}
    </div>
  ) : null;

  const primaryActionLink = primaryAction ? (
    <ForgeButton
      data-page-primary-action="true"
      href={primaryAction.href}
      icon={primaryAction.icon}
      variant="primary"
    >
      {primaryAction.label}
    </ForgeButton>
  ) : null;

  const statusChipList = statusChips?.length ? (
    <div className="flex flex-wrap gap-2" data-page-status-chips="true">
      {statusChips.map((chip, index) => (
        <ForgeChip icon={chip.icon} key={`${chip.label}-${chip.tone ?? "muted"}-${index}`} tone={chip.tone ?? "muted"}>
          {chip.label}
        </ForgeChip>
      ))}
    </div>
  ) : null;

  const workflowNode = workflowSlot ? (
    <div className="page-frame-workflow-slot" data-page-workflow-slot="true">
      {workflowSlot}
    </div>
  ) : null;

  const headerTools = hasHeaderTools ? (
    <div className="flex flex-col items-start gap-3 sm:items-end" data-page-header-tools="true">
      {statusChipList}
      <div className="flex flex-wrap gap-3 sm:justify-end">
        {actionLinks}
        {primaryActionLink}
      </div>
      {workflowNode}
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
            {headerTools}
          </div>
        </section>
      ) : hasHeaderTools ? (
        <div className="flex flex-wrap justify-end gap-3">
          {statusChipList}
          {actionLinks}
          {primaryActionLink}
          {workflowNode}
        </div>
      ) : null}

      {children}
    </div>
  );
}
