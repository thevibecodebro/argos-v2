import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@argos-v2/ui";
import { ForgeIcon } from "../forge";

type SettingsEditorWorkbenchProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  drawer?: ReactNode;
  workbench: string;
};

type SettingsDrawerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children?: ReactNode;
  icon?: string;
};

export function SettingsEditorWorkbench({
  children,
  className,
  drawer,
  workbench,
  ...props
}: SettingsEditorWorkbenchProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]",
        className,
      )}
      data-settings-editor-workbench={workbench}
      {...props}
    >
      <div className="min-w-0">{children}</div>
      {drawer}
    </div>
  );
}

export function SettingsEditorPanel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-[var(--forge-border)] bg-[rgba(255,244,230,0.026)] p-3 sm:p-4",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SettingsEditorDrawer({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "rounded-lg border border-[var(--forge-border)] bg-[rgba(255,244,230,0.026)] p-3 xl:sticky xl:top-3 xl:self-start",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SettingsDrawerGroup({
  children,
  className,
  label,
}: {
  children?: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <section
      className={cn("space-y-2", className)}
      data-settings-drawer-group={label}
    >
      <p className="text-xs font-medium text-[var(--forge-muted)]">{label}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

export function SettingsDrawerButton({
  active = false,
  children,
  className,
  icon,
  type = "button",
  ...props
}: SettingsDrawerButtonProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--forge-muted)] transition hover:bg-[rgba(255,244,230,0.04)] hover:text-[var(--forge-text)] disabled:cursor-not-allowed disabled:opacity-45",
        active && "bg-[rgba(241,191,123,0.12)] text-[var(--forge-gold)]",
        className,
      )}
      type={type}
      {...props}
    >
      {icon ? <ForgeIcon name={icon} size={16} /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
