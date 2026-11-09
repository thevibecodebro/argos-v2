import type { ReactNode } from "react";
import { ForgeButton } from "../forge";
import { OperationalWorkspace } from "../operational-workspace";
import { WorkspacePageHeader } from "../workspace-page-header";
import { SettingsSecondaryRail, type SettingsSecondaryRailItem } from "./settings-secondary-rail";
import styles from "./settings-workspace.module.css";

export type SettingsWorkspaceProps = {
  actions?: Array<{ href: string; icon?: string; label: string; variant?: "primary" | "secondary" | "ghost" }>;
  children: ReactNode;
  description: string;
  railItems: SettingsSecondaryRailItem[];
  route: "account" | "branding" | "people" | "teams" | "permissions" | "integrations" | "rubrics" | "compliance";
  title: string;
  variant?: "detail" | "editor";
};

export function SettingsWorkspace({ actions, children, description, railItems, route, title, variant = "detail" }: SettingsWorkspaceProps) {
  return (
    <OperationalWorkspace className={styles.workspace} data-settings-route={route === "account" ? "settings" : undefined} data-settings-detail-route={route} data-settings-editor-route={variant === "editor" ? route : undefined}>
      <WorkspacePageHeader title={title} description={description} actions={actions?.map((action) => (
        <ForgeButton href={action.href} icon={action.icon} key={action.href} size="sm" variant={action.variant ?? "secondary"}>{action.label}</ForgeButton>
      ))} />
      <SettingsSecondaryRail activeKey={route} items={railItems} />
      <div className={styles.content} data-settings-detail-panel="true" data-settings-editor-panel={variant === "editor" ? "true" : undefined}>
        {children}
      </div>
    </OperationalWorkspace>
  );
}
