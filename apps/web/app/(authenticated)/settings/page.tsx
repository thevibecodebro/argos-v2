// apps/web/app/(authenticated)/settings/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgeErrorState, ForgeIcon, ForgeSettingsGroup } from "@/components/forge";
import { PageFrame } from "@/components/page-frame";
import { AccountPanel } from "@/components/page-panel-loaders";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";

const SETTINGS_SECTIONS = [
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
      <PageFrame
        description="Settings needs an app user record before profile and org management can load."
        eyebrow="Provisioning"
        title="Account"
        tone="warning"
      >
        <ForgeErrorState
          description={result?.error ?? "Unable to load settings."}
          title="Settings unavailable"
        />
      </PageFrame>
    );
  }

  return (
    <PageFrame
      description="Control account details, people, teams, integrations, compliance, and the scoring rubric from one workspace."
      eyebrow="Settings"
      title="Control room"
    >
      <div className="space-y-5">
        <ForgeSettingsGroup
          description="HighLevel-style settings architecture for the Argos workspace: one landing page, grouped controls, and clear admin scope."
          title="Workspace map"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SETTINGS_SECTIONS.filter(
              (section) =>
                !section.visibleTo ||
                (result.data.role !== null &&
                  (section.visibleTo as readonly string[]).includes(result.data.role)),
            ).map((section) => (
              <Link
                className="group rounded-[1.15rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.028)] p-4 transition hover:-translate-y-0.5 hover:border-[rgba(241,191,123,0.32)] hover:bg-[rgba(241,191,123,0.055)]"
                href={section.href}
                key={section.href}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-xl border border-[rgba(241,191,123,0.24)] bg-[rgba(241,191,123,0.08)] p-2 text-[var(--forge-gold)]">
                    <ForgeIcon name={section.icon} size={18} />
                  </span>
                  <div>
                    <h3 className="font-[var(--font-display)] text-sm font-semibold text-[var(--forge-text)] transition group-hover:text-[var(--forge-gold)]">
                      {section.label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">
                      {section.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ForgeSettingsGroup>

        <ForgeSettingsGroup
          description="Manage your display name and view your organization details."
          title="Account"
        >
          <AccountPanel initialUser={result.data} />
        </ForgeSettingsGroup>
      </div>
    </PageFrame>
  );
}
