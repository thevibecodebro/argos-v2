import { redirect } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
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
  const sectionClassName = selectedRep
    ? "grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
    : "grid min-w-0 gap-3";

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

        <section className={sectionClassName}>
          <div className="min-w-0">
            <TeamRosterView dashboard={dashboard} />
          </div>
          {selectedRep ? (
            <OperationalPreviewDrawer
              actions={[
                { href: `/team/${selectedRep.id}`, label: "Open profile", variant: "primary" },
                { href: "/training", label: "Assign training", variant: "secondary" },
              ]}
              data-selected-object-drawer="true"
              description={
                selectedRep.needsCoaching
                  ? "This rep is currently flagged for coaching. Review recent calls before assigning training."
                  : "This rep is stable this week. Review the profile for trend and call context."
              }
              eyebrow="Selected rep"
              title={formatRepName(selectedRep)}
            >
              <div className="grid gap-2 text-sm">
                <PreviewRow label="Average score" value={selectedRep.compositeScore ?? "--"} />
                <PreviewRow label="Calls reviewed" value={selectedRep.callCount ?? 0} />
                <PreviewRow label="Week movement" value={formatDelta(selectedRep.weekOverWeekDelta)} />
                <PreviewRow
                  label="Coaching focus"
                  value={selectedRep.needsCoaching ? "Needs coaching" : "Stable this week"}
                />
              </div>
            </OperationalPreviewDrawer>
          ) : null}
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
