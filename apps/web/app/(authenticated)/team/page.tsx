import { redirect } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { TeamRosterView } from "@/components/team/team-views";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getManagerDashboard } from "@/lib/dashboard/service";

export default async function TeamPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;

  if (profile?.role === "rep") {
    redirect("/dashboard");
  }

  const dashboard = authUser ? await getManagerDashboard(repository, authUser.id) : null;
  const reps = dashboard?.reps ?? [];
  const selectedRep = reps.find((rep) => rep.needsCoaching) ?? reps[0] ?? null;
  const trainingOverdueEstimate = reps.filter((rep) => rep.needsCoaching).length;

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-team-route="roster-first">
        <OperationalToolbar
          actions={[{ href: "/leaderboard", label: "Open leaderboard", variant: "secondary" }]}
          description="Review team performance, coaching focus, and rep-level score movement."
          eyebrow="People"
          status={{ icon: "group", label: `${reps.length} active reps`, tone: "muted" }}
          title="Team"
        />

        <OperationalMetricStrip
          metrics={[
            {
              icon: "group",
              label: "Active reps",
              tone: reps.length > 0 ? "gold" : "muted",
              value: reps.length,
            },
            {
              icon: "monitoring",
              label: "Average score",
              tone: scoreTone(dashboard?.teamAvgScore),
              value: dashboard?.teamAvgScore ?? "--",
            },
            {
              icon: "warning",
              label: "At-risk reps",
              tone: (dashboard?.coachingFlagsCount ?? 0) > 0 ? "ember" : "success",
              value: dashboard?.coachingFlagsCount ?? 0,
            },
            {
              icon: "assignment_late",
              label: "Training overdue",
              tone: trainingOverdueEstimate > 0 ? "ember" : "muted",
              value: trainingOverdueEstimate,
            },
          ]}
        />

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <TeamRosterView dashboard={dashboard} />
          </div>
          <OperationalPreviewDrawer
            actions={
              selectedRep
                ? [
                    { href: `/team/${selectedRep.id}`, label: "Open profile", variant: "primary" },
                    { href: "/training", label: "Assign training", variant: "secondary" },
                  ]
                : [{ href: "/settings/people", label: "Manage people", variant: "secondary" }]
            }
            description={
              selectedRep
                ? selectedRep.needsCoaching
                  ? "This rep is currently flagged for coaching. Review recent calls before assigning training."
                  : "This rep is stable this week. Review the profile for trend and call context."
                : "Team coaching context appears here once reps are available."
            }
            eyebrow="Selected rep"
            title={selectedRep ? formatRepName(selectedRep) : "No rep selected"}
          >
            <div className="grid gap-2 text-sm">
              <PreviewRow label="Average score" value={selectedRep?.compositeScore ?? "--"} />
              <PreviewRow label="Calls reviewed" value={selectedRep?.callCount ?? 0} />
              <PreviewRow label="Week movement" value={formatDelta(selectedRep?.weekOverWeekDelta)} />
              <PreviewRow
                label="Coaching focus"
                value={selectedRep?.needsCoaching ? "Needs coaching" : "Stable this week"}
              />
            </div>
          </OperationalPreviewDrawer>
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function formatRepName(rep: { firstName: string | null; lastName: string | null }) {
  return [rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep";
}

function formatDelta(value: number | null | undefined) {
  if (typeof value !== "number") return "--";
  if (value > 0) return `+${value}`;
  return String(value);
}

function scoreTone(value: number | null | undefined) {
  if (typeof value !== "number") return "muted";
  if (value >= 85) return "success";
  if (value >= 70) return "gold";
  if (value >= 60) return "ember";
  return "danger";
}

function PreviewRow({
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
