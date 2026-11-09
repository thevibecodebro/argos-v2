import Link from "next/link";
import { cn } from "@argos-v2/ui";
import { ForgeChip, ForgeEmptyState, ForgeIcon } from "@/components/forge";
import type { ManagerDashboard, RepBadges, RepCard, RepDashboard, WeeklyPoint } from "@/lib/dashboard/service";

type TeamRosterViewProps = { dashboard: ManagerDashboard | null };
type TeamRepProfileViewProps = { badges: RepBadges | null; rep: RepCard; repDashboard: RepDashboard };
const panelClass = "min-w-0 overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface)]";
const badgeIcons: Record<string, string> = { first_call: "call", calls_10: "stacked_line_chart", calls_50: "workspace_premium", elite_performer: "military_tech", sharp_closer: "track_changes", discovery_pro: "travel_explore", rapport_builder: "groups_2", certified: "school", roleplay_5x: "theater_comedy" };

export function TeamRosterView({ dashboard }: TeamRosterViewProps) {
  const reps = dashboard?.reps ?? [];
  const coachingCount = dashboard?.coachingFlagsCount ?? 0;
  return (
    <div data-team-workspace="roster-first">
      <section className={panelClass} data-team-roster-table="true">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--forge-border)] px-4 py-4">
          <h2 className="text-sm font-semibold text-[var(--forge-text)]">Rep roster <span className="ml-1 font-normal text-[var(--forge-muted)]">({reps.length})</span></h2>
          <ForgeChip tone={coachingCount > 0 ? "ember" : "muted"}>{coachingCount} need review</ForgeChip>
        </div>
        {reps.length ? <>
          <div className="divide-y divide-[var(--forge-border)] md:hidden" data-team-mobile-roster="true">
            {reps.map((rep) => <Link className="block min-w-0 space-y-3 p-4 hover:bg-[var(--forge-surface-2)]" href={`/team/${rep.id}`} key={rep.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-semibold text-[var(--forge-text)]">{formatRepName(rep)}</p>
                <ForgeChip tone={rep.needsCoaching ? "ember" : "muted"}>{rep.needsCoaching ? "Needs coaching" : "Stable"}</ForgeChip>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <Cell label="Avg score" value={formatScore(rep.compositeScore)} />
                <Cell label="Calls" value={rep.callCount} />
                <Cell label="Trend" value={formatDelta(rep.weekOverWeekDelta)} />
              </dl>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--forge-gold)]">Open profile <ForgeIcon name="arrow_forward" size={14} /></span>
            </Link>)}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead><tr className="border-b border-[var(--forge-border)] text-left text-xs font-medium text-[var(--forge-muted)]">
                {['Rep','Score','Calls','Trend','Status'].map((label) => <th className="px-4 py-3 font-medium" key={label} scope="col">{label}</th>)}
                <th className="px-4 py-3 text-right font-medium" scope="col">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-[var(--forge-border)]">
                {reps.map((rep) => <tr className="hover:bg-[var(--forge-surface-2)]" key={rep.id}>
                  <td className="px-4 py-3"><Link className="flex min-h-11 items-center gap-3 font-medium text-[var(--forge-text)] hover:underline" href={`/team/${rep.id}`}><RepAvatar rep={rep} /><span className="break-words">{formatRepName(rep)}</span></Link></td>
                  <td className={cn("forge-tabular-nums px-4 py-3 font-semibold", scoreClass(rep.compositeScore))}>{formatScore(rep.compositeScore)}</td>
                  <td className="forge-tabular-nums px-4 py-3 text-[var(--forge-text)]">{rep.callCount}</td>
                  <td className="forge-tabular-nums px-4 py-3 text-[var(--forge-text)]">{formatDelta(rep.weekOverWeekDelta)}</td>
                  <td className="px-4 py-3"><ForgeChip tone={rep.needsCoaching ? "ember" : "muted"}>{rep.needsCoaching ? "Needs coaching" : "Stable"}</ForgeChip></td>
                  <td className="px-4 py-3 text-right"><Link className="inline-flex min-h-11 items-center gap-1 font-medium text-[var(--forge-gold)] hover:underline" href={`/team/${rep.id}`}>Open profile <ForgeIcon name="arrow_forward" size={15} /></Link></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </> : <ForgeEmptyState className="p-6" description="Share the org slug with reps or upload more calls to populate the team roster." icon="group_off" title="No team members found" />}
      </section>
    </div>
  );
}

export function TeamRepProfileView({ badges, rep, repDashboard }: TeamRepProfileViewProps) {
  const totalTrendCalls = repDashboard.weeklyTrend.reduce((sum, point) => sum + point.callCount, 0);
  return (
    <div className="min-w-0 space-y-6" data-rep-profile-workbench="true">
      <section className="min-w-0" data-rep-coaching-bench="true">
        <div className="mb-3"><h2 className="text-base font-semibold text-[var(--forge-text)]">Focus areas</h2><p className="mt-1 max-w-[70ch] text-sm leading-6 text-[var(--forge-muted)]">{repDashboard.categoryAnalyticsContextLabel ?? "Lowest-scoring categories across recent calls."}</p></div>
        {repDashboard.lowestCategories.length ? <dl className="divide-y divide-[var(--forge-border)] border-y border-[var(--forge-border)]">
          {repDashboard.lowestCategories.map((category) => <div className="flex items-center justify-between gap-4 py-3 text-sm" key={category.category}><dt className="text-[var(--forge-text)]">{category.category}</dt><dd className={cn("forge-tabular-nums font-semibold", scoreClass(category.avgScore))}>{Math.round(category.avgScore)}</dd></div>)}
        </dl> : <Empty description="No focus categories yet for this rep." />}
      </section>
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--forge-border)] px-4 py-3"><h2 className="text-base font-semibold text-[var(--forge-text)]">Recent calls</h2><Link className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--forge-gold)] hover:underline" href="/calls">Open calls</Link></div>
        {repDashboard.recentCalls.length ? <div className="divide-y divide-[var(--forge-border)]">
          {repDashboard.recentCalls.map((call) => <Link className="flex min-w-0 flex-wrap items-center justify-between gap-4 px-4 py-4 hover:bg-[var(--forge-surface-2)]" href={`/calls/${call.id}`} key={call.id}>
            <div className="min-w-0 flex-1 basis-48"><p className="break-words text-sm font-medium text-[var(--forge-text)]">{call.callTopic ?? "Untitled call"}</p><p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--forge-muted)]"><span>{formatDate(call.createdAt, true)}</span><span>{call.status}</span>{typeof call.durationSeconds === "number" ? <span>{Math.floor(call.durationSeconds / 60)}:{String(call.durationSeconds % 60).padStart(2,"0")}</span> : null}</p></div>
            <div className="flex shrink-0 items-center gap-4"><div className="text-right"><p className={cn("forge-tabular-nums text-lg font-semibold", scoreClass(call.overallScore))}>{formatScore(call.overallScore)}</p><p className="text-xs text-[var(--forge-muted)]">Overall score</p></div><ForgeIcon name="arrow_forward" size={16} /></div>
          </Link>)}
        </div> : <Empty description="No recent calls for this rep yet." />}
      </section>
      <details className="border-y border-[var(--forge-border)]" data-rep-trend="disclosure">
        <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 py-3 text-sm font-medium text-[var(--forge-text)]"><span>Weekly trend</span><span className="forge-tabular-nums text-xs font-normal text-[var(--forge-muted)]">{totalTrendCalls} calls</span></summary>
        <WeeklyTrend points={repDashboard.weeklyTrend} />
      </details>
      <details className="border-b border-[var(--forge-border)]" data-rep-milestones="disclosure">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[var(--forge-text)]">Badges &amp; milestones <span className="ml-1 font-normal text-[var(--forge-muted)]">({badges?.badges.filter((badge) => badge.earned).length ?? 0} earned)</span></summary>
        {badges?.badges.length ? <div className="divide-y divide-[var(--forge-border)]">{badges.badges.map((badge) => <div className="flex items-start gap-3 py-4" key={badge.id}>
          <ForgeIcon className="mt-1 shrink-0 text-[var(--forge-muted)]" name={badgeIcons[badge.id] ?? "bookmark"} size={20} />
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium text-[var(--forge-text)]">{badge.name}</h3><ForgeChip tone={badge.earned ? "success" : "muted"}>{badge.earned ? "Earned" : "In progress"}</ForgeChip></div><p className="mt-1 max-w-[70ch] text-sm leading-6 text-[var(--forge-muted)]">{badge.description}</p><p className="mt-1 text-xs text-[var(--forge-muted)]">{badge.earnedAt ? `Earned ${formatDate(badge.earnedAt)}` : "Not earned yet"}</p></div>
        </div>)}</div> : <Empty description="No badges available yet." />}
      </details>
    </div>
  );
}
function WeeklyTrend({ points }: { points: WeeklyPoint[] }) {
  return points.length ? <div className="pb-3"><table className="w-full text-left text-sm"><thead className="text-xs text-[var(--forge-muted)]"><tr><th className="py-2 font-medium" scope="col">Week of</th><th className="py-2 font-medium" scope="col">Avg score</th><th className="py-2 text-right font-medium" scope="col">Calls</th></tr></thead><tbody className="divide-y divide-[var(--forge-border)]">{points.map((point) => <tr key={point.week}><td className="py-2 text-[var(--forge-text)]"><WeekDate value={point.week} /></td><td className={cn("forge-tabular-nums py-2", scoreClass(point.avgScore))}>{typeof point.avgScore === "number" ? Math.round(point.avgScore) : "—"}</td><td className="forge-tabular-nums py-2 text-right text-[var(--forge-text)]">{point.callCount}</td></tr>)}</tbody></table></div> : <Empty description="No weekly trend available yet." />;
}
function Cell({ label, value }: { label: string; value: number | string }) { return <div><dt className="text-xs text-[var(--forge-muted)]">{label}</dt><dd className="forge-tabular-nums mt-1 font-medium text-[var(--forge-text)]">{value}</dd></div>; }
function Empty({ description }: { description: string }) { return <ForgeEmptyState className="px-4 py-6" description={description} title="No data yet" />; }
function RepAvatar({ rep }: { rep: RepCard }) { return rep.profileImageUrl ? <img alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" src={rep.profileImageUrl} /> : <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--forge-surface-2)] text-xs text-[var(--forge-text)]">{[rep.firstName,rep.lastName].filter(Boolean).map((name) => name?.[0]).join("") || "AR"}</span>; }
function formatRepName(rep: RepCard) { return [rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep"; }
function formatScore(value: number | null | undefined) { return value ?? "—"; }
function formatDelta(value: number | null | undefined) { return value == null ? "—" : `${value > 0 ? "+" : ""}${value}`; }
function scoreClass(value: number | null | undefined) { return typeof value !== "number" ? "text-[var(--forge-muted)]" : value >= 85 ? "text-[var(--forge-success)]" : value >= 70 ? "text-[var(--forge-text)]" : value >= 60 ? "text-[var(--forge-ember)]" : "text-[var(--forge-danger)]"; }
function parseDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  // Service week keys are YYYY-MM-DD; reject impossible dates rather than rolling into another month.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && date.toISOString().slice(0, 10) !== value) return null;
  return date;
}
function WeekDate({ value }: { value: string }) {
  const date = parseDate(value);
  return date ? <time dateTime={date.toISOString().slice(0, 10)}>{formatDate(value)}</time> : <>Date unavailable</>;
}
function formatDate(value: string, time = false) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", ...(time ? { timeStyle: "short" as const } : {}), timeZone: "UTC" }).format(date)
    : "Date unavailable";
}
