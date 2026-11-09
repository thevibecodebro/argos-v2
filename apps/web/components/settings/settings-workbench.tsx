import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@argos-v2/ui";
import { ForgeIcon } from "../forge";
import styles from "./settings-workbench.module.css";

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
      className={cn(styles.workbench, className)}
      data-settings-editor-workbench={workbench}
      {...props}
    >
      {drawer}
      <div className="min-w-0">{children}</div>
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
      className={cn(styles.panel, className)}
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
    <section
      className={cn(styles.controls, className)}
      {...props}
    >
      {children}
    </section>
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
  active,
  children,
  className,
  icon,
  type = "button",
  ...props
}: SettingsDrawerButtonProps) {
  return (
    <button
      className={cn(
        styles.controlButton,
        active && styles.active,
        className,
      )}
      aria-pressed={active}
      type={type}
      {...props}
    >
      {icon ? <ForgeIcon name={icon} size={16} /> : null}
      <span className="min-w-0">{children}</span>
    </button>
  );
}
