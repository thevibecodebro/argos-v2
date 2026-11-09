import Link from "next/link";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeChip } from "@/components/forge";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import type { ManagerDashboard, RepBadges, RepCard, RepDashboard } from "@/lib/dashboard/service";
import { TeamRepProfileView, TeamRosterView } from "./team-views";

const actionClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface)] px-4 text-sm font-medium text-[var(--forge-text)] hover:bg-[var(--forge-surface-2)]";

export function TeamPageView({ dashboard, canViewLeaderboard = true }: { dashboard: ManagerDashboard | null; canViewLeaderboard?: boolean }) {
  return (
    <AuthenticatedPageContainer>
      <div className="min-w-0 space-y-6" data-operational-workspace="true" data-team-route="roster-first">
        <WorkspacePageHeader title="Team" description="Find reps who need coaching." actions={canViewLeaderboard ? <Link className={actionClass} href="/leaderboard">Leaderboard</Link> : undefined} />
        <TeamRosterView dashboard={dashboard} />
      </div>
    </AuthenticatedPageContainer>
  );
}

export function TeamRepPageView({ badges, rep, repDashboard, canViewTraining = true }: { badges: RepBadges | null; rep: RepCard; repDashboard: RepDashboard; canViewTraining?: boolean }) {
  const repName = [rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Team member";
  return (
    <AuthenticatedPageContainer>
      <div className="min-w-0 space-y-6" data-operational-workspace="true" data-rep-profile-route="coaching-detail">
        <WorkspacePageHeader
          title={repName}
          description="Review calls and coaching focus."
          actions={<Link className={actionClass} href="/team">Back to team</Link>}
        />
        <section aria-label="Rep performance" className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-[var(--forge-border)] pb-5">
          <ForgeChip tone={rep.needsCoaching ? "ember" : "success"}>{rep.needsCoaching ? "Needs coaching" : "Stable this week"}</ForgeChip>
          <dl className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <div><dt className="text-xs text-[var(--forge-muted)]">Average score</dt><dd className="forge-tabular-nums mt-1 font-semibold text-[var(--forge-text)]">{rep.compositeScore ?? "—"}</dd></div>
            <div><dt className="text-xs text-[var(--forge-muted)]">Calls reviewed</dt><dd className="forge-tabular-nums mt-1 font-semibold text-[var(--forge-text)]">{rep.callCount}</dd></div>
            <div><dt className="text-xs text-[var(--forge-muted)]">Week movement</dt><dd className="forge-tabular-nums mt-1 font-semibold text-[var(--forge-text)]">{rep.weekOverWeekDelta == null ? "—" : `${rep.weekOverWeekDelta > 0 ? "+" : ""}${rep.weekOverWeekDelta}`}</dd></div>
          </dl>
          {canViewTraining ? <Link className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--forge-gold)] hover:underline" href="/training">Open training</Link> : null}
        </section>
        <TeamRepProfileView badges={badges} rep={rep} repDashboard={repDashboard} />
      </div>
    </AuthenticatedPageContainer>
  );
}
