import { notFound, redirect } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { TeamRepProfileView } from "@/components/team/team-views";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  getManagerDashboard,
  getRepBadges,
  getRepDashboard,
} from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export default async function RepProfilePage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = await params;
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;
  const repository = authUser
    ? await createEffectiveTenantRepository(createDashboardRepository(), authUser.id)
    : createDashboardRepository();

  if (profile?.role === "rep") {
    redirect("/dashboard");
  }

  const [managerDashboard, repDashboard, badges] = authUser
    ? await Promise.all([
        getManagerDashboard(repository, authUser.id),
        getRepDashboard(repository, authUser.id, repId),
        getRepBadges(repository, authUser.id, repId),
      ])
    : [null, null, null];

  const rep = managerDashboard?.reps.find((member) => member.id === repId);

  if (!rep || !repDashboard) {
    notFound();
  }

  const repName = formatRepName(rep);
  const earnedBadges = badges?.badges.filter((badge) => badge.earned).length ?? 0;

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-rep-profile-route="coaching-detail">
        <OperationalToolbar
          actions={[
            { href: "/team", icon: "arrow_back", label: "Back to team", variant: "secondary" },
            { href: "/calls", icon: "subject", label: "Open calls", variant: "primary" },
          ]}
          description="Review score trends, focus categories, badges, and recent calls for the selected team member."
          eyebrow="Coaching"
          status={{
            icon: rep.needsCoaching ? "warning" : "check_circle",
            label: rep.needsCoaching ? "Needs coaching" : "Stable this week",
            tone: rep.needsCoaching ? "ember" : "success",
          }}
          title={repName}
        />
        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <TeamRepProfileView badges={badges} rep={rep} repDashboard={repDashboard} />
          </div>
          <OperationalPreviewDrawer
            actions={[
              { href: "/calls", icon: "subject", label: "Open call library", variant: "secondary" },
              { href: "/training", icon: "school", label: "Open training", variant: "secondary" },
            ]}
            data-selected-object-drawer="true"
            description="Rep-level coaching status and next review paths."
            eyebrow="Team member"
            title={repName}
          >
            <div className="grid gap-2 text-sm">
              <SummaryRow label="Status" value={rep.needsCoaching ? "Needs coaching" : "Stable"} />
              <SummaryRow label="Badges earned" value={earnedBadges} />
              <SummaryRow label="Calls reviewed" value={rep.callCount} />
              <SummaryRow label="Week trend" value={formatDelta(rep.weekOverWeekDelta)} />
            </div>
          </OperationalPreviewDrawer>
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function formatRepName(rep: { firstName: string | null; lastName: string | null }) {
  return [rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Team member";
}

function formatDelta(value: number | null | undefined) {
  if (typeof value !== "number") return "--";
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : `${value}`;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-[var(--forge-muted)]">{label}</span>
      <span className="font-semibold text-[var(--forge-text)]">{value}</span>
    </div>
  );
}
