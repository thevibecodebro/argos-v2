import { Children } from "react";
import Link from "next/link";
import {
  Activity, AlignLeft, Archive, ArrowLeft, ArrowRight, ArrowRightToLine,
  ArrowUpRight, AtSign, AudioLines, Award, BarChart3, Bell, BookText, Bookmark,
  Bot, Braces, Brain, Bug, Building2, CalendarDays, ChartLine, Check, CheckCheck,
  CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, Circle, CircleAlert,
  CircleDot, CircleHelp,
  ClipboardCheck, Clock, CloudOff, CloudUpload, Copy, CreditCard, Crosshair, Drama,
  ExternalLink, Eye, Factory, FileText, FileUp, Fingerprint, Flag, Globe,
  GraduationCap, History, Info, LayoutDashboard, Layers, Lightbulb, ListChecks,
  ListFilter, Lock, LockOpen, LogIn, LogOut, Mail, MailOpen, Medal, MessageCircle,
  MessagesSquare, Mic, Network, Paperclip, Phone, PhoneCall, Play, Plus, PlusCircle,
  Power, RefreshCw, School, Search, Send, Settings, Shield, ShieldCheck, SignalZero,
  SlidersHorizontal, Sparkles, SquarePen, Store, Table, Target, TrendingUp,
  TriangleAlert, Trophy, Upload, User, UserCog, UserPlus, UserSearch,
  Users, Video, Wand2, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@argos-v2/ui";

export type ForgeTone = "gold" | "ember" | "cyan" | "success" | "danger" | "muted";
type ForgeSurfaceVariant = "panel" | "inset" | "subtle" | "interactive";
type ForgeButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ForgeButtonSize = "sm" | "md";

type ForgeAction = {
  href: string;
  icon?: string;
  label: string;
};

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

type ForgeStatCardProps = {
  className?: string;
  description?: string;
  icon?: string;
  label: string;
  tone?: ForgeTone;
  value: React.ReactNode;
  valueSize?: "standard" | "compact";
  variant?: ForgeSurfaceVariant;
};

type ForgeScoreMeterProps = {
  className?: string;
  label: string;
  max?: number;
  minVisiblePercent?: number;
  showValue?: boolean;
  tone?: ForgeTone;
  value: number | null | undefined;
  valueSuffix?: string;
};

type ForgeEmptyStateProps = {
  action?: ForgeAction;
  className?: string;
  description: string;
  icon?: string;
  title: string;
};

type ForgeSkeletonProps = {
  className?: string;
  label?: string;
  lines?: number;
};

type ForgeWidgetProps = {
  action?: ForgeAction;
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

type ForgeStatusAnnouncement = "off" | "polite" | "assertive";

type ForgeStatusPanelProps = Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  action?: ForgeAction;
  announce?: ForgeStatusAnnouncement;
  children?: React.ReactNode;
  className?: string;
  description?: string;
  icon?: string;
  title: string;
  tone?: ForgeTone;
};

type ForgeErrorStateProps = Omit<ForgeStatusPanelProps, "icon" | "tone"> & {
  icon?: string;
};

type ForgeSegmentedTabsProps = {
  children?: React.ReactNode;
  className?: string;
  label: string;
};

type ForgeSegmentedTabBaseProps = {
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  icon?: string;
};

type ForgeSegmentedTabLinkProps = ForgeSegmentedTabBaseProps &
  Omit<React.ComponentProps<typeof Link>, "children" | "className"> & {
    href: string;
  };

type ForgeSegmentedTabButtonProps = ForgeSegmentedTabBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ForgeReadinessPanelProps = {
  className?: string;
  description?: string;
  items?: Array<{ label: string; value: string | number }>;
  label: string;
  statusLabel?: string;
  statusTone?: ForgeTone;
  tone?: ForgeTone;
  value: string | number;
};

type ForgeManagementTableProps = {
  children?: React.ReactNode;
  className?: string;
  mobileCards?: React.ReactNode;
};

type ForgeMobileTableCardsProps = {
  children?: React.ReactNode;
  className?: string;
};

type ForgeWorkspaceLayoutProps =
  Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
    children?: React.ReactNode;
    mainClassName?: string;
    railCount?: 1 | 2;
    railPlacement?: "left" | "bookend";
    rails?: React.ReactNode;
  };

type ForgeWorkspaceRailProps =
  Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
    children?: React.ReactNode;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    description?: string;
    eyebrow?: string;
    title: string;
  };

type ForgeWorkspaceRailGroupProps = {
  children?: React.ReactNode;
  className?: string;
  label: string;
};

type ForgeWorkspaceRailActionBaseProps = {
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  icon?: string;
};

type ForgeWorkspaceRailActionLinkProps = ForgeWorkspaceRailActionBaseProps &
  Omit<React.ComponentProps<typeof Link>, "children" | "className"> & {
    href: string;
  };

type ForgeWorkspaceRailActionButtonProps = ForgeWorkspaceRailActionBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
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
      <dl className="flex items-start justify-between gap-3">
        <div>
          <dt className="forge-metric-label">{label}</dt>
          <dd
            className={cn("forge-metric-value", `forge-metric-value--${tone}`)}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </dd>
        </div>
        {delta ? (
          <div>
            <dt className="sr-only">{label} change</dt>
            <dd>
              <ForgeChip tone={tone}>{delta}</ForgeChip>
            </dd>
          </div>
        ) : null}
      </dl>
      {description ? <p className="mt-3 text-sm leading-6 text-[var(--forge-muted)]">{description}</p> : null}
    </ForgeSurface>
  );
}

function forgeToneTextClass(tone: ForgeTone) {
  if (tone === "success") return "text-[var(--forge-success)]";
  if (tone === "danger") return "text-[var(--forge-danger)]";
  if (tone === "ember") return "text-[var(--forge-ember)]";
  if (tone === "cyan") return "text-[var(--forge-cyan)]";
  if (tone === "muted") return "text-[var(--forge-text)]";
  return "text-[var(--forge-gold)]";
}

function forgeToneBarClass(tone: ForgeTone) {
  if (tone === "success") return "bg-[var(--forge-success)]";
  if (tone === "danger") return "bg-[var(--forge-danger)]";
  if (tone === "ember") return "bg-[var(--forge-ember)]";
  if (tone === "cyan") return "bg-[var(--forge-cyan)]";
  if (tone === "muted") return "bg-[color-mix(in_srgb,var(--forge-text)_18%,transparent)]";
  return "bg-[var(--forge-gold)]";
}

function forgeToneIconClass(tone: ForgeTone) {
  if (tone === "success") return "border-[color-mix(in_srgb,var(--forge-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-success)_10%,transparent)] text-[var(--forge-success)]";
  if (tone === "danger") return "border-[color-mix(in_srgb,var(--forge-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-danger)_10%,transparent)] text-[var(--forge-danger)]";
  if (tone === "ember") return "border-[color-mix(in_srgb,var(--forge-ember)_26%,transparent)] bg-[color-mix(in_srgb,var(--forge-ember)_10%,transparent)] text-[var(--forge-ember)]";
  if (tone === "cyan") return "border-[var(--forge-cyan)]/20 bg-[var(--forge-cyan)]/10 text-[var(--forge-cyan)]";
  if (tone === "muted") return "border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface-2)]/45 text-[var(--forge-muted)]";
  return "border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/10 text-[var(--forge-gold)]";
}

function forgeScoreTone(value: number | null | undefined, tone?: ForgeTone): ForgeTone {
  if (tone) return tone;
  if (typeof value !== "number" || !Number.isFinite(value)) return "muted";
  if (value >= 85) return "success";
  if (value >= 70) return "gold";
  if (value >= 60) return "ember";
  return "danger";
}

export function ForgeStatCard({
  className,
  description,
  icon,
  label,
  tone = "gold",
  value,
  valueSize = "standard",
  variant = "inset",
}: ForgeStatCardProps) {
  return (
    <ForgeSurface
      as="article"
      className={cn("forge-stat-card p-4", className)}
      data-forge-stat-card={tone}
      variant={variant}
    >
      <dl className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <dt className="forge-metric-label">{label}</dt>
          <dd
            className={cn("forge-metric-value break-words", forgeToneTextClass(tone))}
            style={{
              fontVariantNumeric: "tabular-nums",
              ...(valueSize === "compact"
                ? { fontSize: "0.875rem", letterSpacing: "0", lineHeight: 1.35 }
                : null),
            }}
          >
            {value}
          </dd>
        </div>
        {icon ? (
          <div className={cn("rounded-2xl border p-2.5", forgeToneIconClass(tone))}>
            <ForgeIcon name={icon} size={20} />
          </div>
        ) : null}
      </dl>
      {description ? <p className="mt-4 text-sm leading-6 text-[var(--forge-muted)]">{description}</p> : null}
    </ForgeSurface>
  );
}

export function ForgeScoreMeter({
  className,
  label,
  max = 100,
  minVisiblePercent = 8,
  showValue = false,
  tone,
  value,
  valueSuffix = "",
}: ForgeScoreMeterProps) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const clampedValue = hasValue ? Math.max(0, Math.min(value, max)) : null;
  const resolvedTone = forgeScoreTone(clampedValue, tone);
  const width = hasValue
    ? Math.max(minVisiblePercent, Math.min(100, ((clampedValue ?? 0) / max) * 100))
    : minVisiblePercent;
  const roundedValue = clampedValue === null ? null : Math.round(clampedValue);
  const displayValue = roundedValue === null ? "—" : `${roundedValue}${valueSuffix}`;
  const ariaValueText = roundedValue === null
    ? "No score yet"
    : valueSuffix === "%"
      ? displayValue
      : `${displayValue} out of ${max}`;

  return (
    <div className={cn("forge-score-meter flex min-w-0 items-center gap-2", className)} data-forge-score-meter={resolvedTone}>
      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={roundedValue ?? undefined}
        aria-valuetext={ariaValueText}
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--forge-surface-3)]"
        role="progressbar"
      >
        <div
          className={cn("h-full rounded-full transition-all", forgeToneBarClass(resolvedTone))}
          style={{ width: `${width}%` }}
        />
      </div>
      {showValue ? (
        <span className={cn("forge-tabular-nums w-10 text-right text-sm font-semibold", forgeToneTextClass(resolvedTone))}>
          {displayValue}
        </span>
      ) : null}
    </div>
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
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] text-[var(--forge-gold)]">
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
          <ForgeButton href={action.href} icon={action.icon} variant="secondary">
            {action.label}
          </ForgeButton>
        </div>
      ) : null}
    </ForgeSurface>
  );
}

export function ForgeStatusPanel({
  action,
  announce = "off",
  children,
  className,
  description,
  icon = "lightbulb",
  role,
  title,
  tone = "muted",
  "aria-live": ariaLive,
  ...props
}: ForgeStatusPanelProps) {
  const announcementProps =
    announce === "off"
      ? { "aria-live": ariaLive, role }
      : {
          "aria-live": ariaLive ?? announce,
          role: role ?? (announce === "assertive" ? "alert" : "status"),
        };

  return (
    <ForgeSurface
      className={cn("forge-status-panel px-5 py-6", className)}
      data-forge-status-panel={tone}
      variant="subtle"
      {...announcementProps}
      {...props}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className={cn("forge-status-panel-icon", `forge-status-panel-icon--${tone}`)}>
            <ForgeIcon name={icon} size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-[var(--font-display)] text-base font-semibold text-[var(--forge-text)]">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--forge-muted)]">
                {description}
              </p>
            ) : null}
            {children ? <div className="mt-4">{children}</div> : null}
          </div>
        </div>
        {action ? (
          <ForgeButton href={action.href} icon={action.icon} size="sm" variant="secondary">
            {action.label}
          </ForgeButton>
        ) : null}
      </div>
    </ForgeSurface>
  );
}

export function ForgeErrorState({
  icon = "warning",
  ...props
}: ForgeErrorStateProps) {
  return (
    <ForgeStatusPanel
      announce="assertive"
      data-forge-error-state="true"
      icon={icon}
      tone="danger"
      {...props}
    />
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

export function ForgeSkeleton({
  className,
  label = "Loading content",
  lines = 4,
}: ForgeSkeletonProps) {
  return (
    <ForgeSurface
      aria-busy="true"
      aria-label={label}
      className={cn("p-6", className)}
      role="status"
      variant="panel"
    >
      <span className="sr-only">{label}</span>
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

export function ForgeSegmentedTabs({
  children,
  className,
  label,
}: ForgeSegmentedTabsProps) {
  return (
    <nav
      aria-label={label}
      className={cn("forge-segmented-tabs", className)}
      data-forge-segmented-tabs="true"
    >
      {children}
    </nav>
  );
}

export function ForgeSegmentedTab(
  props: ForgeSegmentedTabLinkProps | ForgeSegmentedTabButtonProps,
) {
  const {
    active = false,
    children,
    className,
    icon,
    ...rest
  } = props;
  const classes = cn("forge-segmented-tab", active && "forge-segmented-tab--active", className);
  const content = (
    <>
      {icon ? <ForgeIcon name={icon} size={15} /> : null}
      <span>{children}</span>
    </>
  );

  if ("href" in rest && rest.href) {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={classes}
        data-forge-segmented-tab-active={active ? "true" : "false"}
        {...(rest as Omit<ForgeSegmentedTabLinkProps, keyof ForgeSegmentedTabBaseProps>)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      aria-pressed={active}
      className={classes}
      data-forge-segmented-tab-active={active ? "true" : "false"}
      type="button"
      {...(rest as Omit<ForgeSegmentedTabButtonProps, keyof ForgeSegmentedTabBaseProps>)}
    >
      {content}
    </button>
  );
}

export function ForgeReadinessPanel({
  className,
  description,
  items,
  label,
  statusLabel,
  statusTone,
  tone = "gold",
  value,
}: ForgeReadinessPanelProps) {
  const resolvedStatusTone = statusTone ?? tone;

  return (
    <ForgeSurface
      className={cn("forge-readiness-panel p-5", className)}
      data-forge-readiness-panel={tone}
      variant="inset"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="forge-metric-label">{label}</p>
          <p className={cn("forge-metric-value mt-2", `forge-metric-value--${tone}`)}>{value}</p>
        </div>
        {statusLabel ? <ForgeChip tone={resolvedStatusTone}>{statusLabel}</ForgeChip> : null}
      </div>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-[var(--forge-muted)]">{description}</p>
      ) : null}
      {items?.length ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <div className="forge-readiness-panel-item" key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </ForgeSurface>
  );
}

export function ForgeManagementTable({
  children,
  className,
  mobileCards,
}: ForgeManagementTableProps) {
  return (
    <section className={cn("forge-management-table", className)} data-forge-management-table="true">
      <div className={cn(mobileCards && "hidden md:block")}>
        <ForgeTableShell>{children}</ForgeTableShell>
      </div>
      {mobileCards ? <div className="md:hidden">{mobileCards}</div> : null}
    </section>
  );
}

export function ForgeMobileTableCards({
  children,
  className,
}: ForgeMobileTableCardsProps) {
  return (
    <div className={cn("forge-mobile-table-cards", className)} data-forge-mobile-table-cards="true">
      {children}
    </div>
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
          <ForgeButton href={action.href} icon={action.icon} size="sm" variant="ghost">
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

export function ForgeWorkspaceLayout({
  children,
  className,
  mainClassName,
  railCount,
  railPlacement = "left",
  rails,
  ...props
}: ForgeWorkspaceLayoutProps) {
  const inferredRailCount = railCount ?? (rails ? Math.min(Children.count(rails), 2) : 1);
  const layoutMode = inferredRailCount === 2 ? "two-rails" : "one-rail";

  return (
    <div
      className={cn(
        "forge-workspace-layout",
        className,
      )}
      data-forge-workspace-layout={layoutMode}
      data-forge-workspace-placement={railPlacement}
      {...props}
    >
      {rails ? (
        <>
          {rails}
          <main className={cn("min-w-0", mainClassName)} data-forge-workspace-main="true">
            {children}
          </main>
        </>
      ) : (
        children
      )}
    </div>
  );
}

export function ForgeWorkspaceRail({
  children,
  className,
  collapsible = false,
  defaultCollapsed = false,
  description,
  eyebrow,
  title,
  ...props
}: ForgeWorkspaceRailProps) {
  return (
    <aside
      className={cn(
        "forge-workspace-rail",
        className,
      )}
      data-forge-workspace-rail="true"
      data-forge-workspace-rail-collapsible={collapsible ? "true" : undefined}
      data-forge-workspace-rail-collapsed-default={collapsible ? String(defaultCollapsed) : undefined}
      {...props}
    >
      <div className="forge-workspace-rail-header mb-5 rounded-[1.15rem] border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="forge-workspace-rail-header-text min-w-0">
            {eyebrow ? <p className="forge-page-eyebrow">{eyebrow}</p> : null}
            <h3 className="mt-2 text-base font-semibold text-[var(--forge-text)]">{title}</h3>
            {description ? (
              <p className="mt-2 text-xs leading-5 text-[var(--forge-muted)]">{description}</p>
            ) : null}
          </div>
          {collapsible ? (
            <label
              className="forge-workspace-rail-collapse-control"
              title={defaultCollapsed ? `Expand ${title}` : `Collapse ${title}`}
            >
              <input
                aria-label={defaultCollapsed ? `Expand ${title}` : `Collapse ${title}`}
                className="forge-workspace-rail-collapse-input sr-only"
                defaultChecked={defaultCollapsed}
                type="checkbox"
              />
              <ForgeIcon name="chevron_left" size={19} />
              <span className="sr-only">
                {defaultCollapsed ? `Expand ${title}` : `Collapse ${title}`}
              </span>
            </label>
          ) : null}
        </div>
      </div>
      <div className="forge-workspace-rail-body space-y-5">{children}</div>
    </aside>
  );
}

export function ForgeWorkspaceRailGroup({
  children,
  className,
  label,
}: ForgeWorkspaceRailGroupProps) {
  return (
    <section className={cn("space-y-2", className)} data-forge-workspace-rail-group={label}>
      <p className="forge-nav-section-label px-3">{label}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

export function ForgeWorkspaceRailAction(
  props: ForgeWorkspaceRailActionLinkProps | ForgeWorkspaceRailActionButtonProps,
) {
  const {
    active = false,
    children,
    className,
    icon,
    ...rest
  } = props;
  const actionLabel = typeof children === "string" ? children : undefined;
  const classes = cn(
    "forge-nav-link flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-[var(--font-display)] text-[0.7rem] font-bold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-45",
    active && "forge-nav-link--active",
    className,
  );
  const content = (
    <>
      {icon ? <ForgeIcon name={icon} size={18} /> : null}
      <span className="truncate" data-forge-workspace-rail-action-label="true">{children}</span>
    </>
  );

  if ("href" in rest && rest.href) {
    const linkRest = rest as Omit<ForgeWorkspaceRailActionLinkProps, keyof ForgeWorkspaceRailActionBaseProps>;

    return (
      <Link
        aria-label={linkRest["aria-label"] ?? actionLabel}
        aria-current={active ? linkRest["aria-current"] ?? "page" : linkRest["aria-current"]}
        className={classes}
        data-forge-workspace-rail-action="true"
        {...linkRest}
      >
        {content}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ForgeWorkspaceRailActionButtonProps, keyof ForgeWorkspaceRailActionBaseProps>;
  const hasExplicitAriaState =
    Object.prototype.hasOwnProperty.call(buttonRest, "aria-pressed") ||
    Object.prototype.hasOwnProperty.call(buttonRest, "aria-checked") ||
    Object.prototype.hasOwnProperty.call(buttonRest, "aria-selected") ||
    Object.prototype.hasOwnProperty.call(buttonRest, "aria-expanded") ||
    Object.prototype.hasOwnProperty.call(buttonRest, "aria-current");

  return (
    <button
      aria-label={buttonRest["aria-label"] ?? actionLabel}
      aria-pressed={active && !hasExplicitAriaState ? true : buttonRest["aria-pressed"]}
      className={classes}
      data-forge-workspace-rail-action="true"
      type={buttonRest.type ?? "button"}
      {...buttonRest}
    >
      {content}
    </button>
  );
}

const ICON_REGISTRY: Record<string, LucideIcon> = {
  account_tree: Network,
  activity: Activity,
  add: Plus,
  add_business: Store,
  add_circle: PlusCircle,
  admin_panel_settings: ShieldCheck,
  alternate_email: AtSign,
  analytics: BarChart3,
  archive: Archive,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  arrow_outward: ArrowUpRight,
  assignment_add: ClipboardCheck,
  attach_file: Paperclip,
  auto_awesome: Sparkles,
  auto_fix: Wand2,
  auto_fix_high: Wand2,
  bookmark: Bookmark,
  bug_report: Bug,
  business: Building2,
  calendar_month: CalendarDays,
  call: Phone,
  call_log: PhoneCall,
  chat_bubble: MessageCircle,
  check: Check,
  check_circle: CheckCircle2,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  cloud_off: CloudOff,
  cloud_upload: CloudUpload,
  close: X,
  content_copy: Copy,
  dashboard: LayoutDashboard,
  data_object: Braces,
  done_all: CheckCheck,
  edit_note: SquarePen,
  edit_square: SquarePen,
  email: Mail,
  error: CircleAlert,
  fact_check: ClipboardCheck,
  filter_list: ListFilter,
  fingerprint: Fingerprint,
  flag: Flag,
  forum: MessagesSquare,
  grading: ClipboardCheck,
  graphic_eq: AudioLines,
  group: Users,
  group_add: UserPlus,
  group_off: Users,
  groups: Users,
  groups_2: Users,
  help: CircleHelp,
  history: History,
  info: Info,
  input: ArrowRightToLine,
  insights: ChartLine,
  leaderboard: Trophy,
  library_books: BookText,
  lightbulb: Lightbulb,
  lock: Lock,
  lock_open: LockOpen,
  login: LogIn,
  logout: LogOut,
  mail: Mail,
  mark_email_read: MailOpen,
  mic: Mic,
  military_tech: Medal,
  monitoring: Activity,
  north_east: ArrowUpRight,
  notifications: Bell,
  open_in_new: ExternalLink,
  payments: CreditCard,
  pending: Clock,
  person: User,
  person_add: UserPlus,
  person_search: UserSearch,
  play_arrow: Play,
  power: Power,
  precision_manufacturing: Factory,
  preview: Eye,
  psychology: Brain,
  publish: Upload,
  query_stats: ChartLine,
  queue: Layers,
  radio_button_checked: CircleDot,
  radio_button_unchecked: Circle,
  record_voice_over: Mic,
  refresh: RefreshCw,
  rule: ListChecks,
  schedule: Clock,
  school: GraduationCap,
  search: Search,
  send: Send,
  settings: Settings,
  shield: Shield,
  signal_cellular_nodata: SignalZero,
  smart_toy: Bot,
  stacked_line_chart: ChartLine,
  subject: AlignLeft,
  summarize: FileText,
  supervisor_account: UserCog,
  table: Table,
  table_chart: Table,
  target: Target,
  task_alt: CheckCircle2,
  theater_comedy: Drama,
  track_changes: Crosshair,
  travel_explore: Globe,
  trending_up: TrendingUp,
  tune: SlidersHorizontal,
  unfold_more: ChevronsUpDown,
  upload: Upload,
  upload_file: FileUp,
  verified_user: ShieldCheck,
  videocam: Video,
  warning: TriangleAlert,
  workspace_premium: Award,
};

function normalizeIconName(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return normalized || "help";
}

export function ForgeIcon({
  className,
  name,
  size = 16,
}: {
  className?: string;
  name: string;
  size?: number;
}) {
  const iconName = normalizeIconName(name);
  const Icon = ICON_REGISTRY[iconName] ?? CircleHelp;

  return (
    <Icon
      aria-hidden="true"
      className={cn("forge-icon forge-symbol-icon shrink-0", className)}
      data-forge-icon-name={iconName}
      size={size}
      strokeWidth={1.75}
    />
  );
}
