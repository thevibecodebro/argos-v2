import Link from "next/link";
import { cn } from "@argos-v2/ui";
import type {
  ManagerDashboard,
  RepBadges,
  RepCard,
  RepDashboard,
  WeeklyPoint,
} from "@/lib/dashboard/service";

type TeamRosterViewProps = {
  dashboard: ManagerDashboard | null;
};

type TeamRepProfileViewProps = {
  badges: RepBadges | null;
  rep: RepCard;
  repDashboard: RepDashboard;
};

const shellPanelClass =
  "rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,19,26,0.92),rgba(10,13,19,0.98))] shadow-[0_24px_70px_rgba(3,8,20,0.34)] backdrop-blur-xl";

const insetPanelClass =
  "rounded-[1.5rem] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

const badgeIconById: Record<string, string> = {
  first_call: "call",
  calls_10: "stacked_line_chart",
  calls_50: "workspace_premium",
  elite_performer: "military_tech",
  sharp_closer: "track_changes",
  discovery_pro: "travel_explore",
  rapport_builder: "groups_2",
  certified: "school",
  roleplay_5x: "theater_comedy",
};

export function TeamRosterView({ dashboard }: TeamRosterViewProps) {
  const reps = dashboard?.reps ?? [];
  const teamAverage = dashboard?.teamAvgScore ?? null;
  const coachingFlagsCount = dashboard?.coachingFlagsCount ?? 0;
  const totalCallsThisMonth = dashboard?.totalCallsThisMonth ?? 0;
  const stableCount = Math.max(reps.length - coachingFlagsCount, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <article className={cn(shellPanelClass, "relative overflow-hidden p-6 sm:p-7")}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[-20%] top-[-35%] h-48 rounded-full bg-[radial-gradient(circle,rgba(116,177,255,0.22),transparent_68%)] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 translate-x-10 translate-y-10 rounded-full border border-[#74b1ff]/10 bg-[#74b1ff]/5 blur-2xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="space-y-4">
              <SectionEyebrow>Roster overview</SectionEyebrow>
              <div className="space-y-3">
                <h3 className="max-w-lg text-3xl font-semibold tracking-tight text-[#ecedf6] md:text-[2.6rem] md:leading-[1.02]">
                  Keep the team readable at a glance, then drill into the rep who needs attention.
                </h3>
                <p className="max-w-[62ch] text-sm leading-7 text-[#a9abb3]">
                  Review team performance with week-over-week trend, call volume, and coaching flags.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <HighlightStat
                description="Reps currently visible in your team view."
                icon="group"
                label="Active reps"
                tone="blue"
                value={reps.length}
              />
              <HighlightStat
                description="Average score across completed calls this month."
                icon="insights"
                label="Team average"
                tone={scoreTone(teamAverage)}
                value={formatScore(teamAverage)}
              />
            </div>
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <MetricPanel
            description={
              coachingFlagsCount > 0
                ? `${coachingFlagsCount} rep${coachingFlagsCount === 1 ? "" : "s"} currently need coaching.`
                : "No reps are currently flagged for coaching."
            }
            icon="warning"
            label="Needs coaching"
            tone={coachingFlagsCount > 0 ? "amber" : "blue"}
            value={coachingFlagsCount}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            <MetricPanel
              description="Completed calls since the start of the month."
              icon="call"
              label="Calls reviewed"
              tone="slate"
              value={totalCallsThisMonth}
            />
            <MetricPanel
              description="Reps not currently flagged for coaching."
              icon="check_circle"
              label="Stable this week"
              tone="emerald"
              value={stableCount}
            />
          </div>
        </div>
      </section>

      <section className={cn(shellPanelClass, "overflow-hidden")}>
        <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <SectionEyebrow>Rep roster</SectionEyebrow>
              <p className="text-sm leading-7 text-[#a9abb3]">
                Open any rep to review focus areas, recent calls, and badges.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a9abb3]">
              {reps.length} {reps.length === 1 ? "rep" : "reps"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusChip label="Needs coaching" tone="amber" />
            <StatusChip label="Stable this week" tone="slate" />
          </div>
        </div>

        {reps.length ? (
          <>
            <div className="md:hidden">
              <div className="space-y-3 p-4">
                {reps.map((rep) => (
                  <Link
                    className={cn(
                      insetPanelClass,
                      "group block p-4 transition duration-300 hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/[0.06] active:scale-[0.99]",
                    )}
                    href={`/team/${rep.id}`}
                    key={rep.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <RepAvatar rep={rep} size="md" />
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-[#ecedf6]">{formatRepName(rep)}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#7f8796]">
                            Open profile
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[#74b1ff] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                        north_east
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <CompactMetric label="Average score" value={formatScore(rep.compositeScore)} />
                      <CompactMetric label="Week trend" value={formatDelta(rep.weekOverWeekDelta)} />
                      <CompactMetric label="Calls reviewed" value={rep.callCount} />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <StatusChip
                        label={rep.needsCoaching ? "Needs coaching" : "Stable this week"}
                        tone={rep.needsCoaching ? "amber" : "slate"}
                      />
                      <ScoreMeter score={rep.compositeScore} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(140px,0.75fr)_minmax(150px,0.75fr)_minmax(120px,0.65fr)_minmax(170px,0.8fr)_42px] gap-4 border-b border-white/10 px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-[#7f8796]">
                <span>Rep</span>
                <span>Average score</span>
                <span>Week trend</span>
                <span className="text-right">Calls</span>
                <span>Coaching</span>
                <span className="sr-only">Open profile</span>
              </div>
              <div className="divide-y divide-white/[0.08]">
                {reps.map((rep, index) => (
                  <Link
                    className="group grid grid-cols-[minmax(0,1.8fr)_minmax(140px,0.75fr)_minmax(150px,0.75fr)_minmax(120px,0.65fr)_minmax(170px,0.8fr)_42px] gap-4 px-6 py-4 transition duration-300 hover:bg-[#74b1ff]/5 active:scale-[0.998]"
                    href={`/team/${rep.id}`}
                    key={rep.id}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <RepAvatar rep={rep} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#ecedf6]">
                            {formatRepName(rep)}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#7f8796]">
                            Open profile
                          </p>
                        </div>
                      </div>
                    </div>

                    <ScoreMetric score={rep.compositeScore} />

                    <div className="flex min-w-0 flex-col justify-center gap-2">
                      <p className={cn("text-sm font-semibold", trendTextTone(rep.weekOverWeekDelta))}>
                        {formatDelta(rep.weekOverWeekDelta)}
                      </p>
                      <DeltaTrack delta={rep.weekOverWeekDelta} />
                    </div>

                    <div className="flex flex-col items-end justify-center">
                      <p className="text-lg font-semibold text-[#ecedf6]">{rep.callCount}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#7f8796]">
                        reviewed
                      </p>
                    </div>

                    <div className="flex items-center">
                      <StatusChip
                        label={rep.needsCoaching ? "Needs coaching" : "Stable this week"}
                        tone={rep.needsCoaching ? "amber" : "slate"}
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <span className="material-symbols-outlined text-[#74b1ff] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                        arrow_outward
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            body="Share the org slug with reps or upload more calls to populate the team roster."
            icon="group_off"
            title="No team members found"
          />
        )}
      </section>
    </div>
  );
}

export function TeamRepProfileView({
  badges,
  rep,
  repDashboard,
}: TeamRepProfileViewProps) {
  const recentCalls = repDashboard.recentCalls;
  const earnedBadges = (badges?.badges ?? []).filter((badge) => badge.earned).length;
  const totalTrendCalls = repDashboard.weeklyTrend.reduce((sum, point) => sum + point.callCount, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <article className={cn(shellPanelClass, "relative overflow-hidden p-6 sm:p-7")}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-[-10%] w-56 rounded-full bg-[radial-gradient(circle,rgba(116,177,255,0.16),transparent_72%)] blur-3xl"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <RepAvatar rep={rep} size="xl" />
              <div className="min-w-0 space-y-3">
                <SectionEyebrow>Team member</SectionEyebrow>
                <div className="space-y-2">
                  <h3 className="truncate text-3xl font-semibold tracking-tight text-[#ecedf6] md:text-[2.5rem]">
                    {formatRepName(rep)}
                  </h3>
                  <p className="max-w-[58ch] text-sm leading-7 text-[#a9abb3]">
                    Review score trends, focus categories, badges, and recent calls for the selected
                    team member.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip
                    label={rep.needsCoaching ? "Needs coaching" : "Stable this week"}
                    tone={rep.needsCoaching ? "amber" : "slate"}
                  />
                  <StatusChip label={`${earnedBadges} badge${earnedBadges === 1 ? "" : "s"} earned`} tone="blue" />
                </div>
              </div>
            </div>

            <div className={cn(insetPanelClass, "grid min-w-full gap-3 p-4 sm:min-w-[280px]")}>
              <InlineSummary label="Average score" value={formatScore(rep.compositeScore)} />
              <InlineSummary label="Week trend" value={formatDelta(rep.weekOverWeekDelta)} />
              <InlineSummary label="Calls reviewed" value={rep.callCount} />
            </div>
          </div>
        </article>

        <article className={cn(shellPanelClass, "p-6 sm:p-7")}>
          <SectionEyebrow>Current snapshot</SectionEyebrow>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <HighlightStat
              description="Average overall score across completed calls."
              icon="monitoring"
              label="Average score"
              tone={scoreTone(rep.compositeScore)}
              value={formatScore(rep.compositeScore)}
            />
            <HighlightStat
              description="Completed calls included in the rep profile."
              icon="call"
              label="Calls reviewed"
              tone="slate"
              value={rep.callCount}
            />
            <HighlightStat
              description="Difference between this week and last week."
              icon="trending_up"
              label="Week trend"
              tone={deltaTone(rep.weekOverWeekDelta)}
              value={formatDelta(rep.weekOverWeekDelta)}
            />
            <HighlightStat
              description="Average overall score over the past 30 days."
              icon="calendar_month"
              label="30-day average"
              tone={scoreTone(repDashboard.monthlyAvgScore)}
              value={formatScore(repDashboard.monthlyAvgScore)}
            />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <article className={cn(shellPanelClass, "p-6 sm:p-7")}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <SectionEyebrow>Focus areas</SectionEyebrow>
              {repDashboard.categoryAnalyticsContextLabel ? (
                <p className="text-sm leading-7 text-[#a9abb3]">
                  {repDashboard.categoryAnalyticsContextLabel}
                </p>
              ) : (
                <p className="text-sm leading-7 text-[#a9abb3]">
                  Lowest-scoring categories across recent calls.
                </p>
              )}
            </div>
          </div>

          {repDashboard.lowestCategories.length ? (
            <div className="mt-6 space-y-4">
              {repDashboard.lowestCategories.map((category) => (
                <div className="space-y-2" key={category.category}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-[#ecedf6]">{category.category}</span>
                    <span className={cn("text-sm font-semibold", scoreTextTone(category.avgScore))}>
                      {Math.round(category.avgScore)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn("h-full rounded-full", scoreBarTone(category.avgScore))}
                      style={{ width: `${Math.max(6, Math.min(category.avgScore, 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyInsetState body="No focus categories yet for this rep." icon="signal_cellular_nodata" />
          )}
        </article>

        <article className={cn(shellPanelClass, "p-6 sm:p-7")}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <SectionEyebrow>Weekly trend</SectionEyebrow>
              <p className="text-sm leading-7 text-[#a9abb3]">Past 12 weeks of scored-call performance.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a9abb3]">
              {totalTrendCalls} calls reviewed
            </span>
          </div>

          <WeeklyTrendBars points={repDashboard.weeklyTrend} />
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className={cn(shellPanelClass, "p-6 sm:p-7")}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <SectionEyebrow>Recent calls</SectionEyebrow>
              <p className="text-sm leading-7 text-[#a9abb3]">Most recent scored calls available for review.</p>
            </div>
            <Link
              className="rounded-full border border-[#74b1ff]/20 bg-[#74b1ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#74b1ff] transition hover:border-[#74b1ff]/35 hover:bg-[#74b1ff]/[0.15] active:scale-[0.98]"
              href="/calls"
            >
              Open calls
            </Link>
          </div>

          {recentCalls.length ? (
            <div className="mt-6 space-y-3">
              {recentCalls.map((call) => (
                <Link
                  className={cn(
                    insetPanelClass,
                    "group flex flex-col gap-3 p-4 transition duration-300 hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/5 active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between",
                  )}
                  href={`/calls/${call.id}`}
                  key={call.id}
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#ecedf6]">
                      {call.callTopic ?? "Untitled call"}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.18em] text-[#7f8796]">
                      <span>{formatTimestamp(call.createdAt)}</span>
                      <span>{call.status}</span>
                      {typeof call.durationSeconds === "number" ? (
                        <span>{formatDuration(call.durationSeconds)}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className={cn("text-lg font-semibold", scoreTextTone(call.overallScore))}>
                        {formatScore(call.overallScore)}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#7f8796]">
                        Overall score
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[#74b1ff] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                      arrow_outward
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyInsetState body="No recent calls for this rep yet." icon="call_log" />
          )}
        </article>

        <article className={cn(shellPanelClass, "p-6 sm:p-7")}>
          <div className="space-y-2">
            <SectionEyebrow>Badges &amp; milestones</SectionEyebrow>
            <p className="text-sm leading-7 text-[#a9abb3]">Progress markers already earned or still in progress.</p>
          </div>

          {(badges?.badges ?? []).length ? (
            <div className="mt-6 grid gap-3">
              {(badges?.badges ?? []).map((badge) => (
                <div
                  className={cn(
                    insetPanelClass,
                    "flex items-start gap-4 p-4",
                    badge.earned
                      ? "border-[#74b1ff]/20 bg-[#74b1ff]/[0.08]"
                      : "opacity-80",
                  )}
                  key={badge.id}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-[#ecedf6]",
                      badge.earned
                        ? "border-[#74b1ff]/25 bg-[#74b1ff]/[0.12] text-[#74b1ff]"
                        : "border-white/10 bg-white/[0.03] text-[#7f8796]",
                    )}
                  >
                    <span className="material-symbols-outlined">{badgeIconById[badge.id] ?? "bookmark"}</span>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#ecedf6]">{badge.name}</p>
                      <StatusChip label={badge.earned ? "Earned" : "In progress"} tone={badge.earned ? "blue" : "slate"} />
                    </div>
                    <p className="text-sm leading-6 text-[#a9abb3]">{badge.description}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#7f8796]">
                      {badge.earnedAt ? `Earned ${formatShortDate(badge.earnedAt)}` : "Not earned yet"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyInsetState body="No badges available yet." icon="workspace_premium" />
          )}
        </article>
      </section>
    </div>
  );
}

function HighlightStat({
  description,
  icon,
  label,
  tone,
  value,
}: {
  description: string;
  icon: string;
  label: string;
  tone: Tone;
  value: number | string;
}) {
  return (
    <article className={cn(insetPanelClass, "p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#7f8796]">{label}</p>
          <p className={cn("text-3xl font-semibold tracking-tight font-[var(--font-display)]", toneTextClass(tone))}>
            {value}
          </p>
        </div>
        <div className={cn("rounded-2xl border p-2.5", toneIconClass(tone))}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#a9abb3]">{description}</p>
    </article>
  );
}

function MetricPanel({
  description,
  icon,
  label,
  tone,
  value,
}: {
  description: string;
  icon: string;
  label: string;
  tone: Tone;
  value: number | string;
}) {
  return (
    <article className={cn(shellPanelClass, "p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#7f8796]">{label}</p>
          <p className={cn("text-3xl font-semibold tracking-tight font-[var(--font-display)]", toneTextClass(tone))}>
            {value}
          </p>
        </div>
        <div className={cn("rounded-2xl border p-2.5", toneIconClass(tone))}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#a9abb3]">{description}</p>
    </article>
  );
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className={cn(insetPanelClass, "p-3")}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7f8796]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#ecedf6]">{value}</p>
    </div>
  );
}

function ScoreMetric({ score }: { score: number | null }) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-2">
      <p className={cn("text-lg font-semibold", scoreTextTone(score))}>{formatScore(score)}</p>
      <ScoreMeter score={score} />
    </div>
  );
}

function ScoreMeter({ score }: { score: number | null }) {
  const width = typeof score === "number" ? `${Math.max(8, Math.min(score, 100))}%` : "22%";

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
      <div className={cn("h-full rounded-full", scoreBarTone(score))} style={{ width }} />
    </div>
  );
}

function DeltaTrack({ delta }: { delta: number | null }) {
  const left = `${deltaTrackLeft(delta)}%`;

  return (
    <div className="relative h-4">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.08]" />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-white/[0.15]" />
      <span
        className={cn(
          "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 shadow-[0_0_0_4px_rgba(255,255,255,0.02)]",
          deltaTrackTone(delta),
        )}
        style={{ left }}
      />
    </div>
  );
}

function WeeklyTrendBars({ points }: { points: WeeklyPoint[] }) {
  if (!points.some((point) => typeof point.avgScore === "number")) {
    return <EmptyInsetState body="No weekly trend available yet." icon="analytics" className="mt-6" />;
  }

  return (
    <div className="mt-6 space-y-4">
      <div className={cn(insetPanelClass, "p-4")}>
        <div className="grid h-44 grid-cols-12 items-end gap-2">
          {points.map((point) => {
            const hasScore = typeof point.avgScore === "number";
            const height = hasScore ? Math.max(14, Math.round(point.avgScore ?? 0)) : 12;
            return (
              <div className="flex h-full flex-col justify-end gap-2" key={point.week}>
                <div className="flex-1" />
                <div
                  className={cn(
                    "rounded-t-full transition-transform duration-300",
                    hasScore ? scoreBarTone(point.avgScore ?? null) : "bg-white/[0.08]",
                  )}
                  style={{ height: `${height}%`, opacity: hasScore ? 1 : 0.6 }}
                  title={`${formatWeek(point.week)} · ${hasScore ? `${Math.round(point.avgScore ?? 0)} average` : "No score"} · ${point.callCount} calls`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-[11px] uppercase tracking-[0.18em] text-[#7f8796]">
        {[0, 3, 7, 11].map((index) => (
          <span key={points[index]?.week}>{points[index] ? formatWeek(points[index].week) : "—"}</span>
        ))}
      </div>
    </div>
  );
}

function InlineSummary({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f8796]">{label}</span>
      <span className="text-base font-semibold text-[#ecedf6]">{value}</span>
    </div>
  );
}

function EmptyState({
  body,
  icon,
  title,
}: {
  body: string;
  icon: string;
  title: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#74b1ff]">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="mt-4 text-lg font-semibold text-[#ecedf6]">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[#a9abb3]">{body}</p>
    </div>
  );
}

function EmptyInsetState({
  body,
  className,
  icon,
}: {
  body: string;
  className?: string;
  icon: string;
}) {
  return (
    <div className={cn(insetPanelClass, "flex flex-col items-center justify-center gap-3 px-5 py-8 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#74b1ff]">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="max-w-sm text-sm leading-7 text-[#a9abb3]">{body}</p>
    </div>
  );
}

function RepAvatar({
  rep,
  size = "lg",
}: {
  rep: Pick<RepCard, "firstName" | "lastName" | "profileImageUrl">;
  size?: "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "xl" ? "h-[4.5rem] w-[4.5rem] text-xl" : size === "md" ? "h-11 w-11 text-sm" : "h-12 w-12 text-sm";

  if (rep.profileImageUrl) {
    return (
      <img
        alt={formatRepName(rep)}
        className={cn("shrink-0 rounded-2xl border border-white/10 object-cover", sizeClass)}
        src={rep.profileImageUrl}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl border border-[#74b1ff]/20 bg-[#74b1ff]/10 font-semibold text-[#74b1ff]",
        sizeClass,
      )}
    >
      {initials(rep.firstName, rep.lastName)}
    </div>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]", toneChipClass(tone))}>
      {label}
    </span>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#74b1ff]">{children}</p>;
}

function formatRepName(rep: Pick<RepCard, "firstName" | "lastName">) {
  return [rep.firstName, rep.lastName].filter(Boolean).join(" ").trim() || "Unknown rep";
}

function formatScore(value: number | null | undefined) {
  return typeof value === "number" ? value : "—";
}

function formatDelta(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatWeek(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function initials(firstName: string | null, lastName: string | null) {
  const value = [firstName, lastName]
    .filter(Boolean)
    .map((part) => part?.[0]?.toUpperCase())
    .join("");

  return value || "AR";
}

function deltaTrackLeft(value: number | null | undefined) {
  if (typeof value !== "number") return 50;
  const clamped = Math.max(-20, Math.min(20, value));
  return 50 + clamped * 2;
}

type Tone = "amber" | "blue" | "emerald" | "red" | "slate";

function scoreTone(value: number | null | undefined): Tone {
  if (typeof value !== "number") return "slate";
  if (value >= 85) return "emerald";
  if (value >= 70) return "blue";
  if (value >= 60) return "amber";
  return "red";
}

function deltaTone(value: number | null | undefined): Tone {
  if (typeof value !== "number" || value === 0) return "slate";
  return value > 0 ? "emerald" : "amber";
}

function trendTextTone(value: number | null | undefined) {
  if (typeof value !== "number") return "text-[#a9abb3]";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-amber-300";
  return "text-[#ecedf6]";
}

function toneTextClass(tone: Tone) {
  if (tone === "emerald") return "text-emerald-400";
  if (tone === "amber") return "text-amber-300";
  if (tone === "red") return "text-red-400";
  if (tone === "slate") return "text-[#ecedf6]";
  return "text-[#74b1ff]";
}

function toneIconClass(tone: Tone) {
  if (tone === "emerald") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (tone === "amber") return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  if (tone === "red") return "border-red-400/20 bg-red-400/10 text-red-300";
  if (tone === "slate") return "border-white/10 bg-white/[0.04] text-[#a9abb3]";
  return "border-[#74b1ff]/20 bg-[#74b1ff]/10 text-[#74b1ff]";
}

function toneChipClass(tone: Tone) {
  if (tone === "emerald") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (tone === "amber") return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  if (tone === "red") return "border-red-400/20 bg-red-400/10 text-red-300";
  if (tone === "slate") return "border-white/10 bg-white/[0.04] text-[#a9abb3]";
  return "border-[#74b1ff]/20 bg-[#74b1ff]/10 text-[#74b1ff]";
}

function scoreTextTone(value: number | null | undefined) {
  return toneTextClass(scoreTone(value));
}

function scoreBarTone(value: number | null | undefined) {
  const tone = scoreTone(value);

  if (tone === "emerald") return "bg-emerald-400";
  if (tone === "amber") return "bg-amber-300";
  if (tone === "red") return "bg-red-400";
  if (tone === "slate") return "bg-white/[0.15]";
  return "bg-[#74b1ff]";
}

function deltaTrackTone(value: number | null | undefined) {
  const tone = deltaTone(value);

  if (tone === "emerald") return "bg-emerald-400";
  if (tone === "amber") return "bg-amber-300";
  if (tone === "red") return "bg-red-400";
  if (tone === "slate") return "bg-[#a9abb3]";
  return "bg-[#74b1ff]";
}
