import type { ReactNode } from "react";
import { ForgeChip, type ForgeTone } from "@/components/forge";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { SettingsSecondaryRail } from "@/components/settings/settings-secondary-rail";

type SettingsRoute =
  | "people"
  | "teams"
  | "permissions"
  | "integrations"
  | "rubrics"
  | "compliance";

type SettingsOperationalLayoutProps = {
  actions?: Array<{
    href: string;
    icon?: string;
    label: string;
    variant?: "primary" | "secondary" | "ghost";
  }>;
  children: ReactNode;
  description: string;
  previewDescription?: string;
  previewRows?: Array<{ label: string; tone?: ForgeTone; value: ReactNode }>;
  previewTitle?: string;
  route: SettingsRoute;
  title: string;
  variant?: "detail" | "editor";
};

const SETTINGS_SECTIONS = [
  { href: "/settings", icon: "person", key: "account", label: "Account" },
  { href: "/settings/people", icon: "group", key: "people", label: "People" },
  { href: "/settings/teams", icon: "groups", key: "teams", label: "Teams" },
  {
    href: "/settings/permissions",
    icon: "lock",
    key: "permissions",
    label: "Permissions",
  },
  {
    href: "/settings/integrations",
    icon: "power",
    key: "integrations",
    label: "Integrations",
  },
  {
    href: "/settings/rubric",
    icon: "grading",
    key: "rubrics",
    label: "Rubrics",
  },
  {
    href: "/settings/compliance",
    icon: "verified_user",
    key: "compliance",
    label: "Compliance",
  },
] as const;

const SETTINGS_RAIL_ITEMS = SETTINGS_SECTIONS.map((section) => ({
  href: section.href,
  icon: section.icon,
  key: section.key,
  label: section.label,
}));

export function SettingsOperationalLayout({
  actions,
  children,
  description,
  previewDescription,
  previewRows,
  previewTitle,
  route,
  title,
  variant = "detail",
}: SettingsOperationalLayoutProps) {
  const showPreview = Boolean(previewTitle);
  const toolbar = (
    <OperationalToolbar
      actions={actions}
      description={description}
      eyebrow="Settings"
      status={{ icon: "tune", label: `${title} workspace`, tone: "muted" }}
      title={title}
    />
  );

  return (
    <OperationalWorkspace
      data-settings-detail-route={route}
      data-settings-editor-route={variant === "editor" ? route : undefined}
    >
      {toolbar}

      <section
        className={
          showPreview
            ? "grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_320px]"
            : "grid min-w-0 gap-3"
        }
      >
        <SettingsSecondaryRail activeKey={route} items={SETTINGS_RAIL_ITEMS} />

        <section
          className="min-w-0 rounded-xl border border-[var(--forge-border)] bg-[rgba(8,6,5,0.88)] p-3"
          data-settings-detail-panel="true"
          data-settings-editor-panel={variant === "editor" ? "true" : undefined}
        >
          {children}
        </section>

        {showPreview ? (
          <OperationalPreviewDrawer
            description={previewDescription}
            eyebrow="Status"
            title={previewTitle ?? ""}
          >
            <div className="grid gap-2 text-sm">
              {(previewRows ?? []).map((row) => (
                <div
                  className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0"
                  key={row.label}
                >
                  <span className="text-[var(--forge-muted)]">{row.label}</span>
                  <span className="text-right font-semibold text-[var(--forge-text)]">
                    {row.tone ? (
                      <ForgeChip tone={row.tone}>{row.value}</ForgeChip>
                    ) : (
                      row.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          </OperationalPreviewDrawer>
        ) : null}
      </section>
    </OperationalWorkspace>
  );
}
