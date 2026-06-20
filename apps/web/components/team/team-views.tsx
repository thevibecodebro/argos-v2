import Link from "next/link";
import { cn } from "@argos-v2/ui";
import {
  ForgeChip,
  ForgeEmptyState,
  ForgeIcon,
  ForgeScoreMeter,
  ForgeStatCard,
  type ForgeTone,
} from "@/components/forge";
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
  "rounded-xl border border-[var(--forge-border)] bg-[var(--forge-table-bg)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--forge-text)_4%,transparent)]";

const insetPanelClass =
  "rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)]";

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
  const coachingFlagsCount = dashboard?.coachingFlagsCount ?? 0;

  return (
    <div className="space-y-3" data-team-workspace="roster-first">
      <section
        className="overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[var(--forge-table-bg)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--forge-text)_4%,transparent)]"
        data-team-roster-table="true"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.4%,transparent)] px-4 py-3">
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
              Rep roster
            </p>
            <p className="mt-1 text-sm text-[var(--forge-muted)]">
              Scan score, call volume, trend, and coaching status before opening a rep profile.
            </p>
          </div>
          <ForgeChip tone={coachingFlagsCount > 0 ? "ember" : "muted"}>
            {coachingFlagsCount} need review
          </ForgeChip>
        </div>

        {reps.length ? (
          <>
            <div className="grid gap-2 p-3 md:hidden">
              {reps.map((rep) => (
                <Link
                  className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-3 transition hover:border-[color-mix(in_srgb,var(--forge-gold)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--forge-gold)_5.5%,transparent)]"
                  href={`/team/${rep.id}`}
                  key={rep.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                        {formatRepName(rep)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--forge-muted)]">
                        {rep.needsCoaching ? "Needs coaching" : "Stable this week"}
                      </p>
                    </div>
                    <StatusChip
                      label={rep.needsCoaching ? "Needs coaching" : "Stable"}
                      tone={rep.needsCoaching ? "ember" : "muted"}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <CompactCell label="Avg score" value={formatScore(rep.compositeScore)} />
                    <CompactCell label="Calls" value={rep.callCount} />
                    <CompactCell label="Trend" value={formatDelta(rep.weekOverWeekDelta)} />
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--forge-border)] text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                    <th className="px-4 py-3" scope="col">Rep</th>
                    <th className="px-4 py-3" scope="col">Score</th>
                    <th className="px-4 py-3" scope="col">Calls</th>
                    <th className="px-4 py-3" scope="col">Trend</th>
                    <th className="px-4 py-3" scope="col">Status</th>
                    <th className="px-4 py-3 text-right" scope="col">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border)]">
                  {reps.map((rep) => (
                    <tr
                      className="transition hover:bg-[color-mix(in_srgb,var(--forge-gold)_4.5%,transparent)]"
                      key={rep.id}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <RepAvatar rep={rep} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                              {formatRepName(rep)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--forge-muted)]">
                              Coaching profile
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`forge-tabular-nums px-4 py-4 text-sm font-semibold ${scoreTextClass(rep.compositeScore)}`}>
                        {formatScore(rep.compositeScore)}
                      </td>
                      <td className="forge-tabular-nums px-4 py-4 text-sm text-[var(--forge-text)]">{rep.callCount}</td>
                      <td className="px-4 py-4 text-sm text-[var(--forge-muted)]">
                        {formatDelta(rep.weekOverWeekDelta)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusChip
                          label={rep.needsCoaching ? "Needs coaching" : "Stable"}
                          tone={rep.needsCoaching ? "ember" : "muted"}
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--forge-gold)] hover:underline"
                          href={`/team/${rep.id}`}
                        >
                          Open profile
                          <ForgeIcon name="arrow_forward" size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

function CompactCell({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <p className="font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[var(--forge-text)]">{value}</p>
    </div>
  );
}

function scoreTextClass(value: number | null | undefined) {
  const tone = scoreTone(value);
  if (tone === "success") return "text-[var(--forge-success)]";
  if (tone === "gold") return "text-[var(--forge-gold)]";
  if (tone === "ember") return "text-[var(--forge-ember)]";
  if (tone === "danger") return "text-[var(--forge-danger)]";
  return "text-[var(--forge-muted)]";
}

export function TeamRepProfileView({
  badges,
  rep,
  repDashboard,
}: TeamRepProfileViewProps) {
  const recentCalls = repDashboard.recentCalls;
  const totalTrendCalls = repDashboard.weeklyTrend.reduce((sum, point) => sum + point.callCount, 0);

  return (
    <div className="space-y-3" data-rep-profile-workbench="true">
      <section className="grid gap-3" data-rep-coaching-bench="true">
        <article className={cn(shellPanelClass, "p-4")}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <SectionEyebrow>Focus areas</SectionEyebrow>
              {repDashboard.categoryAnalyticsContextLabel ? (
                <p className="text-sm leading-7 text-[var(--forge-muted)]">
                  {repDashboard.categoryAnalyticsContextLabel}
                </p>
              ) : (
                <p className="text-sm leading-7 text-[var(--forge-muted)]">
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
                    <span className="text-sm font-medium text-[var(--forge-text)]">{category.category}</span>
                    <span className={cn("text-sm font-semibold", scoreTextTone(category.avgScore))}>
                      {Math.round(category.avgScore)}
                    </span>
                  </div>
                  <ForgeScoreMeter
                    label={`${category.category} average score`}
                    tone={toForgeTone(scoreTone(category.avgScore))}
                    value={category.avgScore}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyInsetState body="No focus categories yet for this rep." icon="signal_cellular_nodata" />
          )}
        </article>

        <article className={cn(shellPanelClass, "p-4")}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <SectionEyebrow>Weekly trend</SectionEyebrow>
              <p className="text-sm leading-7 text-[var(--forge-muted)]">Past 12 weeks of scored-call performance.</p>
            </div>
            <span className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
              {totalTrendCalls} calls reviewed
            </span>
          </div>

          <WeeklyTrendBars points={repDashboard.weeklyTrend} />
        </article>
      </section>

      <section className="grid gap-3">
        <article className={cn(shellPanelClass, "p-4")}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <SectionEyebrow>Recent calls</SectionEyebrow>
              <p className="text-sm leading-7 text-[var(--forge-muted)]">Most recent scored calls available for review.</p>
            </div>
            <Link
              className="rounded-lg border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--forge-gold)] transition hover:border-[var(--forge-gold)]/35 hover:bg-[var(--forge-gold)]/[0.15] active:scale-[0.98]"
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
                    "group flex flex-col gap-3 p-4 transition duration-300 hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/5 active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between",
                  )}
                  href={`/calls/${call.id}`}
                  key={call.id}
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--forge-text)]">
                      {call.callTopic ?? "Untitled call"}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.18em] text-[var(--forge-muted)]">
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
                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--forge-muted)]">
                        Overall score
                      </p>
                    </div>
                    <ForgeIcon
                      className="text-[var(--forge-gold)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      name="arrow_outward"
                      size={20}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyInsetState body="No recent calls for this rep yet." icon="call_log" />
          )}
        </article>

        <article className={cn(shellPanelClass, "p-4")}>
          <div className="space-y-2">
            <SectionEyebrow>Badges &amp; milestones</SectionEyebrow>
            <p className="text-sm leading-7 text-[var(--forge-muted)]">Progress markers already earned or still in progress.</p>
          </div>

          {(badges?.badges ?? []).length ? (
            <div className="mt-6 grid gap-3">
              {(badges?.badges ?? []).map((badge) => (
                <div
                  className={cn(
                    insetPanelClass,
                    "flex items-start gap-4 p-4",
                    badge.earned
                      ? "border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/[0.08]"
                      : "opacity-80",
                  )}
                  key={badge.id}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-[var(--forge-text)]",
                      badge.earned
                        ? "border-[var(--forge-gold)]/25 bg-[var(--forge-gold)]/[0.12] text-[var(--forge-gold)]"
                        : "border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface-2)]/35 text-[var(--forge-muted)]",
                    )}
                  >
                    <ForgeIcon name={badgeIconById[badge.id] ?? "bookmark"} size={20} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--forge-text)]">{badge.name}</p>
                      <StatusChip label={badge.earned ? "Earned" : "In progress"} tone={badge.earned ? "gold" : "muted"} />
                    </div>
                    <p className="text-sm leading-6 text-[var(--forge-muted)]">{badge.description}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--forge-muted)]">
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
    <ForgeStatCard
      className="p-4 sm:p-5"
      description={description}
      icon={icon}
      label={label}
      tone={toForgeTone(tone)}
      value={value}
      variant="inset"
    />
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
    <ForgeStatCard
      className="p-5"
      description={description}
      icon={icon}
      label={label}
      tone={toForgeTone(tone)}
      value={value}
      variant="panel"
    />
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
    <ForgeStatCard
      className="p-3"
      label={label}
      tone="muted"
      value={value}
      valueSize="compact"
      variant="inset"
    />
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
  return (
    <ForgeScoreMeter
      className="w-24"
      label="Rep average score"
      tone={toForgeTone(scoreTone(score))}
      value={score}
    />
  );
}

function DeltaTrack({ delta }: { delta: number | null }) {
  const left = `${deltaTrackLeft(delta)}%`;

  return (
    <div className="relative h-4">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--forge-border-strong)]/10" />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--forge-border-strong)]/20" />
      <span
        className={cn(
          "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--forge-border-strong)]/10 shadow-[0_0_0_4px_color-mix(in_srgb,var(--forge-gold)_4%,transparent)]",
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
                    hasScore ? scoreBarTone(point.avgScore ?? null) : "bg-[var(--forge-surface-3)]",
                  )}
                  style={{ height: `${height}%`, opacity: hasScore ? 1 : 0.6 }}
                  title={`${formatWeek(point.week)} · ${hasScore ? `${Math.round(point.avgScore ?? 0)} average` : "No score"} · ${point.callCount} calls`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--forge-muted)]">
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
    <div className="flex items-center justify-between gap-4 border-b border-[var(--forge-border-strong)]/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--forge-muted)]">{label}</span>
      <span className="text-base font-semibold text-[var(--forge-text)]">{value}</span>
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
    <ForgeEmptyState
      className="px-6 py-12"
      description={body}
      icon={icon}
      title={title}
    />
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
    <ForgeEmptyState
      className={cn("px-5 py-8", className)}
      description={body}
      icon={icon}
      title="No data yet"
    />
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
        className={cn("shrink-0 rounded-2xl border border-[var(--forge-border-strong)]/10 object-cover", sizeClass)}
        src={rep.profileImageUrl}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/10 font-semibold text-[var(--forge-gold)]",
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
    <ForgeChip className="px-2.5 py-1 text-[10px] tracking-[0.18em]" tone={toForgeTone(tone)}>
      {label}
    </ForgeChip>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-gold)]">{children}</p>;
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

type Tone = ForgeTone | "red";

function toForgeTone(tone: Tone): ForgeTone {
  return tone === "red" ? "danger" : tone;
}

function scoreTone(value: number | null | undefined): Tone {
  if (typeof value !== "number") return "muted";
  if (value >= 85) return "success";
  if (value >= 70) return "gold";
  if (value >= 60) return "ember";
  return "red";
}

function deltaTone(value: number | null | undefined): Tone {
  if (typeof value !== "number" || value === 0) return "muted";
  return value > 0 ? "success" : "ember";
}

function trendTextTone(value: number | null | undefined) {
  if (typeof value !== "number") return "text-[var(--forge-muted)]";
  if (value > 0) return "text-[var(--forge-success)]";
  if (value < 0) return "text-[var(--forge-ember)]";
  return "text-[var(--forge-text)]";
}

function toneTextClass(tone: Tone) {
  if (tone === "success") return "text-[var(--forge-success)]";
  if (tone === "ember") return "text-[var(--forge-ember)]";
  if (tone === "red") return "text-[var(--forge-danger)]";
  if (tone === "muted") return "text-[var(--forge-text)]";
  if (tone === "cyan") return "text-[var(--forge-cyan)]";
  return "text-[var(--forge-gold)]";
}

function scoreTextTone(value: number | null | undefined) {
  return toneTextClass(scoreTone(value));
}

function scoreBarTone(value: number | null | undefined) {
  const tone = scoreTone(value);

  if (tone === "success") return "bg-[var(--forge-success)]";
  if (tone === "ember") return "bg-[var(--forge-ember)]";
  if (tone === "red") return "bg-[var(--forge-danger)]";
  if (tone === "muted") return "bg-[color-mix(in_srgb,var(--forge-text)_18%,transparent)]";
  if (tone === "cyan") return "bg-[var(--forge-cyan)]";
  return "bg-[var(--forge-gold)]";
}

function deltaTrackTone(value: number | null | undefined) {
  const tone = deltaTone(value);

  if (tone === "success") return "bg-[var(--forge-success)]";
  if (tone === "ember") return "bg-[var(--forge-ember)]";
  if (tone === "red") return "bg-[var(--forge-danger)]";
  if (tone === "muted") return "bg-[color-mix(in_srgb,var(--forge-text)_46%,transparent)]";
  if (tone === "cyan") return "bg-[var(--forge-cyan)]";
  return "bg-[var(--forge-gold)]";
}
