import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@argos-v2/ui";
import { ForgeChip, type ForgeTone } from "@/components/forge";

type SettingsSectionHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

type SettingsMetaRowProps = {
  label: string;
  value: ReactNode;
};

type SettingsStatusProps = {
  label: string;
  tone?: ForgeTone;
};

export function SettingsSectionHeader({
  actions,
  children,
  description,
  eyebrow,
  title,
}: SettingsSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--forge-border)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium text-[var(--forge-muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--forge-muted)]">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function SettingsMetaRow({ label, value }: SettingsMetaRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-sm text-[var(--forge-muted)]">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--forge-text)]">
        {value}
      </span>
    </div>
  );
}

export function SettingsStatus({ label, tone = "muted" }: SettingsStatusProps) {
  return <ForgeChip tone={tone}>{label}</ForgeChip>;
}

export function SettingsTableShell({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-shadow)_50%,transparent)]",
        className,
      )}
      data-settings-table-shell="true"
      {...props}
    >
      {children}
    </div>
  );
}
