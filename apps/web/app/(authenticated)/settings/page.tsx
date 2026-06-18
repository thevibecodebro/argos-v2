// apps/web/app/(authenticated)/settings/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgeChip, ForgeErrorState, ForgeIcon } from "@/components/forge";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { AccountPanel } from "@/components/panel-loaders/account-panel-loader";
import { SettingsSecondaryRail } from "@/components/settings/settings-secondary-rail";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";

const SETTINGS_SECTIONS = [
  {
    description: "Set workspace colors for buttons, text, surfaces, and states.",
    href: "/settings/branding",
    icon: "palette",
    label: "Branding",
    visibleTo: ["admin"],
  },
  {
    description: "Manage user records and account access.",
    href: "/settings/people",
    icon: "group",
    label: "People",
    visibleTo: ["admin"],
  },
  {
    description: "Configure team structure and manager assignments.",
    href: "/settings/teams",
    icon: "groups",
    label: "Teams",
    visibleTo: ["admin"],
  },
  {
    description: "Review role scopes and permission boundaries.",
    href: "/settings/permissions",
    icon: "lock",
    label: "Permissions",
    visibleTo: ["admin"],
  },
  {
    description: "Connect and monitor supported providers.",
    href: "/settings/integrations",
    icon: "power",
    label: "Integrations",
    visibleTo: ["admin"],
  },
  {
    description: "Tune the scoring system used on reviewed calls.",
    href: "/settings/rubric",
    icon: "grading",
    label: "Rubrics",
    visibleTo: ["admin"],
  },
  {
    description: "Review consent and operational safeguards.",
    href: "/settings/compliance",
    icon: "verified_user",
    label: "Compliance",
    visibleTo: ["admin"],
  },
] as const;

export default async function SettingsAccountPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);

  if (!result?.ok) {
    return (
      <OperationalWorkspace data-settings-route="control-room">
        <OperationalToolbar
          description="Settings needs an app user record before profile and org management can load."
          eyebrow="Provisioning"
          title="Account"
        />
        <ForgeErrorState
          description={result?.error ?? "Unable to load settings."}
          title="Settings unavailable"
        />
      </OperationalWorkspace>
    );
  }

  const visibleSections = SETTINGS_SECTIONS.filter(
    (section) =>
      !section.visibleTo ||
      (result.data.role !== null &&
        (section.visibleTo as readonly string[]).includes(result.data.role)),
  );
  const workspaceRows = [
    {
      description: "Manage profile details and organization context.",
      href: "/settings",
      icon: "person",
      label: "Account",
      scope: "Personal",
    },
    ...visibleSections.map((section) => ({
      description: section.description,
      href: section.href,
      icon: section.icon,
      label: section.label,
      scope: "Admin",
    })),
  ];
  const settingsRailItems = [
    { href: "/settings", icon: "person", key: "account", label: "Account" },
    ...visibleSections.map((section) => ({
      href: section.href,
      icon: section.icon,
      key: section.label.toLowerCase(),
      label: section.label,
    })),
  ];

  return (
    <OperationalWorkspace data-settings-route="settings">
      <OperationalToolbar
        description="Manage account, people, teams, integrations, compliance, and rubrics."
        eyebrow="Settings"
        status={{ icon: "admin_panel_settings", label: `${result.data.role ?? "member"} access`, tone: "muted" }}
        title="Settings"
      />

      <section className="grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <SettingsSecondaryRail activeKey="account" items={settingsRailItems} />

        <div className="min-w-0 space-y-3">
          <section
            aria-label="Settings sections"
            className="overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-shadow)_88%,transparent)]"
            data-settings-workspace-map="true"
          >
            <div className="divide-y divide-[var(--forge-border)]">
              {workspaceRows.map((section) => (
                <Link
                  className="grid gap-3 px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--forge-gold)_4.5%,transparent)] md:grid-cols-[minmax(0,1fr)_120px_80px]"
                  href={section.href}
                  key={section.href}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 rounded-lg border border-[color-mix(in_srgb,var(--forge-gold)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-gold)_8%,transparent)] p-2 text-[var(--forge-gold)]">
                      <ForgeIcon name={section.icon} size={18} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--forge-text)]">
                        {section.label}
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center md:justify-end">
                    <ForgeChip tone={section.scope === "Admin" ? "gold" : "muted"}>
                      {section.scope}
                    </ForgeChip>
                  </div>
                  <div className="flex items-center text-sm font-semibold text-[var(--forge-gold)] md:justify-end">
                    Edit
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section
            className="rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-4"
            data-settings-inline-detail="account"
          >
            <div className="mb-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                Account
              </p>
              <p className="mt-1 text-sm text-[var(--forge-muted)]">
                Manage your display name and view organization details.
              </p>
            </div>
            <AccountPanel initialUser={result.data} />
          </section>
        </div>

        <OperationalPreviewDrawer
          actions={[{ href: "/settings/rubric", label: "Open rubrics", variant: "secondary" }]}
          description="Organization status and guardrails."
          eyebrow="Organization"
          title={result.data.org?.name ?? "Argos organization"}
        >
          <div className="grid gap-2 text-sm">
            <SummaryRow label="Plan" value={result.data.org?.plan ?? "No plan"} />
            <SummaryRow label="Role" value={result.data.role ?? "member"} />
            <SummaryRow label="Email" value={result.data.email} />
            <SummaryRow label="Org slug" value={result.data.org?.slug ?? "Not assigned"} />
            <SummaryRow label="Sections" value={`${workspaceRows.length} visible`} />
          </div>
        </OperationalPreviewDrawer>
      </section>
    </OperationalWorkspace>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-[var(--forge-muted)]">{label}</span>
      <span className="font-semibold text-[var(--forge-text)]">{value}</span>
    </div>
  );
}
