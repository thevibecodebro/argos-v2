import Link from "next/link";
import { cn } from "@argos-v2/ui";

type ForgeTone = "gold" | "ember" | "cyan" | "success" | "danger" | "muted";
type ForgeSurfaceVariant = "panel" | "inset" | "subtle" | "interactive";
type ForgeButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ForgeButtonSize = "sm" | "md";

type ForgeSurfaceProps<T extends React.ElementType = "section"> = {
  as?: T;
  children?: React.ReactNode;
  className?: string;
  variant?: ForgeSurfaceVariant;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

type ForgeButtonBaseProps = {
  children?: React.ReactNode;
  className?: string;
  icon?: string;
  size?: ForgeButtonSize;
  trailingIcon?: string;
  variant?: ForgeButtonVariant;
};

type ForgeButtonLinkProps = ForgeButtonBaseProps &
  Omit<React.ComponentProps<typeof Link>, "children" | "className"> & {
    href: string;
  };

type ForgeButtonNativeProps = ForgeButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ForgeChipProps = {
  children?: React.ReactNode;
  className?: string;
  icon?: string;
  tone?: ForgeTone;
};

type ForgeMetricProps = {
  className?: string;
  delta?: string;
  description?: string;
  label: string;
  tone?: ForgeTone;
  value: string | number;
};

type ForgeEmptyStateProps = {
  action?: { href: string; label: string };
  className?: string;
  description: string;
  icon?: string;
  title: string;
};

type ForgeSkeletonProps = {
  className?: string;
  lines?: number;
};

type ForgeWidgetProps = {
  action?: { href: string; label: string };
  children?: React.ReactNode;
  className?: string;
  eyebrow?: string;
  title: string;
};

type ForgeSettingsGroupProps = {
  children?: React.ReactNode;
  className?: string;
  description?: string;
  title: string;
};

type ForgeSidePanelShellProps = {
  children?: React.ReactNode;
  className?: string;
  description?: string;
  title: string;
};

export function ForgeSurface<T extends React.ElementType = "section">({
  as,
  children,
  className,
  variant = "panel",
  ...props
}: ForgeSurfaceProps<T>) {
  const Component = as ?? "section";

  return (
    <Component
      className={cn("forge-surface", `forge-surface--${variant}`, className)}
      data-forge-surface={variant}
      {...props}
    >
      {children}
    </Component>
  );
}

export function ForgeButton(props: ForgeButtonLinkProps | ForgeButtonNativeProps) {
  const {
    children,
    className,
    icon,
    size = "md",
    trailingIcon,
    variant = "secondary",
    ...rest
  } = props;
  const content = (
    <>
      {icon ? <ForgeIcon name={icon} /> : null}
      <span>{children}</span>
      {trailingIcon ? <ForgeIcon className="forge-button-trailing-icon" name={trailingIcon} /> : null}
    </>
  );
  const classes = cn(
    "forge-button",
    `forge-button-${variant}`,
    size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm",
    className,
  );

  if ("href" in rest && rest.href) {
    return (
      <Link
        className={classes}
        data-forge-button={variant}
        {...(rest as Omit<ForgeButtonLinkProps, keyof ForgeButtonBaseProps>)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      data-forge-button={variant}
      {...(rest as Omit<ForgeButtonNativeProps, keyof ForgeButtonBaseProps>)}
    >
      {content}
    </button>
  );
}

export function ForgeChip({
  children,
  className,
  icon,
  tone = "muted",
}: ForgeChipProps) {
  return (
    <span className={cn("forge-chip", `forge-chip--${tone}`, className)} data-forge-chip={tone}>
      {icon ? <ForgeIcon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}

export function ForgeMetric({
  className,
  delta,
  description,
  label,
  tone = "gold",
  value,
}: ForgeMetricProps) {
  return (
    <ForgeSurface className={cn("p-4", className)} data-forge-metric={tone} variant="inset">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn("forge-metric-value", `forge-metric-value--${tone}`)} style={{ fontVariantNumeric: "tabular-nums" }}>
            {value}
          </p>
          <p className="forge-metric-label">{label}</p>
        </div>
        {delta ? <ForgeChip tone={tone}>{delta}</ForgeChip> : null}
      </div>
      {description ? <p className="mt-3 text-sm leading-6 text-[var(--forge-muted)]">{description}</p> : null}
    </ForgeSurface>
  );
}

export function ForgeEmptyState({
  action,
  className,
  description,
  icon = "lightbulb",
  title,
}: ForgeEmptyStateProps) {
  return (
    <ForgeSurface
      className={cn("px-5 py-8 text-center sm:px-8", className)}
      data-forge-empty-state="true"
      variant="subtle"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-[var(--forge-gold)]">
        <ForgeIcon name={icon} size={22} />
      </div>
      <h3 className="mt-4 font-[var(--font-display)] text-lg font-semibold text-[var(--forge-text)]">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--forge-muted)]">
        {description}
      </p>
      {action ? (
        <div className="mt-5 flex justify-center">
          <ForgeButton href={action.href} variant="secondary">
            {action.label}
          </ForgeButton>
        </div>
      ) : null}
    </ForgeSurface>
  );
}

export function ForgeActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("forge-action-bar", className)}
      data-forge-action-bar="true"
    >
      {children}
    </div>
  );
}

export function ForgeTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("forge-table-shell", className)} data-forge-table="true">
      {children}
    </div>
  );
}

export function ForgeSkeleton({ className, lines = 4 }: ForgeSkeletonProps) {
  return (
    <ForgeSurface aria-busy="true" className={cn("p-6", className)} variant="panel">
      <div className="space-y-4">
        <div className="forge-skeleton-line h-7 w-48" />
        <div className="grid gap-3">
          {Array.from({ length: lines }).map((_, index) => (
            <div className="forge-skeleton-line h-11" key={index} />
          ))}
        </div>
      </div>
    </ForgeSurface>
  );
}

export function ForgeWidget({
  action,
  children,
  className,
  eyebrow,
  title,
}: ForgeWidgetProps) {
  return (
    <ForgeSurface className={cn("p-5", className)} data-forge-widget="true">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="forge-page-eyebrow">{eyebrow}</p> : null}
          <h3 className="mt-1 font-[var(--font-display)] text-lg font-semibold text-[var(--forge-text)]">
            {title}
          </h3>
        </div>
        {action ? (
          <ForgeButton href={action.href} size="sm" variant="ghost">
            {action.label}
          </ForgeButton>
        ) : null}
      </div>
      {children}
    </ForgeSurface>
  );
}

export function ForgeSettingsGroup({
  children,
  className,
  description,
  title,
}: ForgeSettingsGroupProps) {
  return (
    <ForgeSurface className={cn("p-5 sm:p-6", className)} data-forge-settings-group="true">
      <div className="mb-5">
        <h3 className="font-[var(--font-display)] text-lg font-semibold text-[var(--forge-text)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </ForgeSurface>
  );
}

export function ForgeSidePanelShell({
  children,
  className,
  description,
  title,
}: ForgeSidePanelShellProps) {
  return (
    <aside className={cn("forge-side-panel-shell", className)} data-forge-side-panel="true">
      <div className="border-b border-[var(--forge-border)] px-5 py-4">
        <h3 className="font-[var(--font-display)] text-base font-semibold text-[var(--forge-text)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </aside>
  );
}

function ForgeIcon({
  className,
  name,
  size = 16,
}: {
  className?: string;
  name: string;
  size?: number;
}) {
  return (
    <span className={cn("material-symbols-outlined forge-icon shrink-0", className)} style={{ fontSize: `${size}px` }}>
      {name}
    </span>
  );
}
