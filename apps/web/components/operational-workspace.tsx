import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@argos-v2/ui";
import {
  ForgeButton,
  ForgeChip,
  ForgeIcon,
  type ForgeTone,
} from "./forge";

type OperationalAction = {
  href: string;
  icon?: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

type OperationalStatus = {
  icon?: string;
  label: string;
  tone?: ForgeTone;
};

type OperationalToolbarProps = HTMLAttributes<HTMLElement> & {
  actions?: OperationalAction[];
  description?: string;
  eyebrow?: string;
  status?: OperationalStatus;
  title: string;
};

type OperationalMetric = {
  icon?: string;
  label: string;
  tone?: ForgeTone;
  value: ReactNode;
};

type OperationalMetricStripProps = HTMLAttributes<HTMLDListElement> & {
  metrics: OperationalMetric[];
};

type OperationalPreviewDrawerProps = HTMLAttributes<HTMLElement> & {
  actions?: OperationalAction[];
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

const operationalEyebrowClass =
  "mb-1 text-xs font-medium text-[var(--forge-muted)]";

export function OperationalWorkspace({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("space-y-3", className)}
      data-operational-workspace="true"
      {...props}
    >
      {children}
    </div>
  );
}

export function OperationalToolbar({
  actions,
  children,
  className,
  description,
  eyebrow,
  status,
  title,
  ...props
}: OperationalToolbarProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.026)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.04)] sm:px-4",
        className,
      )}
      data-operational-toolbar="true"
      data-operational-toolbar-density="compact"
      {...props}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className={operationalEyebrowClass}>{eyebrow}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-normal text-[var(--forge-text)]">
              {title}
            </h1>
            {status ? (
              <ForgeChip icon={status.icon} tone={status.tone ?? "muted"}>
                {status.label}
              </ForgeChip>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
              {description}
            </p>
          ) : null}
        </div>

        {actions?.length ? (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions.map((action) => (
              <ForgeButton
                href={action.href}
                icon={action.icon}
                key={`${action.href}-${action.label}`}
                size="sm"
                variant={action.variant ?? "secondary"}
              >
                {action.label}
              </ForgeButton>
            ))}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

export function OperationalMetricStrip({
  className,
  metrics,
  ...props
}: OperationalMetricStripProps) {
  return (
    <dl
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[var(--forge-border)] sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
      data-operational-metric-strip="true"
      {...props}
    >
      {metrics.map((metric) => (
        <div
          className="min-h-14 bg-[rgba(12,9,7,0.96)] px-3 py-2"
          data-operational-metric={metric.tone ?? "muted"}
          key={metric.label}
        >
          <dt className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
            {metric.label}
          </dt>
          <dd
            className={cn(
              "mt-1 flex items-center justify-between gap-3 text-sm font-semibold tabular-nums",
              operationalToneClass(metric.tone ?? "muted"),
            )}
          >
            <span className="min-w-0 truncate">
              {metric.value}
            </span>
            {metric.icon ? (
              <ForgeIcon
                className={cn("text-[1rem]", operationalToneClass(metric.tone ?? "muted"))}
                name={metric.icon}
                size={17}
              />
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function OperationalPreviewDrawer({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
  ...props
}: OperationalPreviewDrawerProps) {
  return (
    <aside
      className={cn(
        "rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.026)] p-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.04)]",
        className,
      )}
      data-operational-preview-drawer="true"
      data-operational-preview-drawer-purpose="selected-object"
      {...props}
    >
      {eyebrow ? <p className={operationalEyebrowClass}>{eyebrow}</p> : null}
      <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-3 space-y-3">{children}</div> : null}
      {actions?.length ? (
        <div className="mt-4 grid gap-2">
          {actions.map((action) => (
            <ForgeButton
              href={action.href}
              icon={action.icon}
              key={`${action.href}-${action.label}`}
              size="sm"
              variant={action.variant ?? "secondary"}
            >
              {action.label}
            </ForgeButton>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function operationalToneClass(tone: ForgeTone) {
  if (tone === "success") return "text-[var(--forge-success)]";
  if (tone === "danger") return "text-[var(--forge-danger)]";
  if (tone === "ember") return "text-[var(--forge-ember)]";
  if (tone === "cyan") return "text-[var(--forge-cyan)]";
  if (tone === "gold") return "text-[var(--forge-gold)]";
  return "text-[var(--forge-text)]";
}
