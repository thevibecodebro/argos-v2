import type { ReactNode } from "react";
import Link from "next/link";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import {
  ForgeButton,
  ForgeEmptyState as ForgeEmptyStatePrimitive,
  ForgeIcon,
  ForgeMetric,
  ForgeWidget,
} from "@/components/forge";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  getDashboardLeaderboard,
  getExecutiveDashboard,
  getManagerDashboard,
  getRepBadges,
  getRepDashboard,
  getSetupStatus,
  type Badge,
  type DashboardLeaderboard,
  type ExecutiveDashboard,
  type ManagerDashboard,
  type RepDashboard,
} from "@/lib/dashboard/service";
import { PageFrame } from "@/components/page-frame";

export default async function DashboardPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;

  if (!authUser || !profile) {
    return (
      <div className="px-12 py-8 max-w-7xl mx-auto">
        <PageFrame
          tone="warning"
          description="This account is authenticated but is not provisioned inside the Argos app database yet."
          eyebrow="Provisioning"
          title="Dashboard unavailable"
        >
          <EmptyState
            description="Complete app provisioning first, then reload this route to unlock the product dashboards."
            title="User record missing"
          />
        </PageFrame>
      </div>
    );
  }

  const isExecutive = profile.role === "executive";
  const isManager = isExecutive || profile.role === "manager" || profile.role === "admin";

  const [repDashboard, badges, managerDashboard, executiveDashboard, leaderboard, setupStatus] =
    await Promise.all([
      getRepDashboard(repository, authUser.id),
      getRepBadges(repository, authUser.id),
      isManager ? getManagerDashboard(repository, authUser.id) : Promise.resolve(null),
      isExecutive ? getExecutiveDashboard(repository, authUser.id) : Promise.resolve(null),
      isManager ? getDashboardLeaderboard(repository, authUser.id) : Promise.resolve(null),
      isManager ? getSetupStatus(repository, authUser.id) : Promise.resolve(null),
    ]);

  return (
    <section className="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full">
      {isExecutive ? (
        <ExecutiveDashboardView
          executiveDashboard={executiveDashboard}
          leaderboard={leaderboard}
          managerDashboard={managerDashboard}
          setupStatus={setupStatus}
        />
      ) : isManager ? (
        <ManagerDashboardView
          leaderboard={leaderboard}
          managerDashboard={managerDashboard}
          setupStatus={setupStatus}
        />
      ) : (
        <RepDashboardView badges={badges?.badges ?? []} dashboard={repDashboard} />
      )}
    </section>
  );
}

/* ── Rep Dashboard ──────────────────────────────────────────────── */

function RepDashboardView({
  badges,
  dashboard,
}: {
  badges: Badge[];
  dashboard: RepDashboard | null;
}) {
  const recentCalls = dashboard?.recentCalls ?? [];
  const focusAreas = dashboard?.lowestCategories ?? [];
  const focusAreasLabel = dashboard?.categoryAnalyticsContextLabel ?? null;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard label="30-day average" value={dashboard?.monthlyAvgScore ?? "—"} />
        <MetricCard label="Calls analyzed" value={recentCalls.length} />
        <MetricCard label="Focus categories" value={focusAreas.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <SurfacePanel title="Recent Calls" link={{ href: "/calls", label: "View all" }}>
          {recentCalls.length ? (
            <div className="space-y-3">
              {recentCalls.map((call) => (
                <Link
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4 transition hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/5"
                  href={`/calls/${call.id}`}
                  key={call.id}
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--forge-text)]">
                      {call.callTopic ?? "Untitled call"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--forge-muted)]">{formatTimestamp(call.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${scoreColor(call.overallScore)}`}>
                      {call.overallScore ?? "—"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--forge-muted)]">
                      {call.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Upload a call to create a scored record, highlights, and coaching feedback."
              title="No recent calls"
            />
          )}
        </SurfacePanel>

        <SurfacePanel title="Focus Areas" link={{ href: "/training", label: "Open training" }}>
          {focusAreasLabel ? (
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[var(--forge-gold)]">
              {focusAreasLabel}
            </p>
          ) : null}
          {focusAreas.length ? (
            <div className="space-y-3">
              {focusAreas.map((area) => (
                <BarRow
                  key={area.category}
                  label={area.category}
                  tone={scoreColor(area.avgScore)}
                  value={area.avgScore}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Your lowest categories appear here once scored calls are available."
              title="No focus data"
            />
          )}
        </SurfacePanel>
      </div>

      <SurfacePanel title="Badges & Milestones" link={{ href: "/training", label: "Keep progressing" }}>
        {badges.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {badges.map((badge) => (
              <article
                className={`rounded-xl border px-4 py-4 ${
                  badge.earned
                    ? "border-[rgba(255,159,95,0.26)] bg-[rgba(255,159,95,0.06)]"
                    : "border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 opacity-70"
                }`}
                key={badge.id}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{badge.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--forge-text)]">{badge.name}</p>
                    <p className="mt-1 text-xs text-[var(--forge-muted)]">{badge.description}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium text-[var(--forge-muted)]">
                  {badge.earned && badge.earnedAt
                    ? `Earned ${formatTimestamp(badge.earnedAt)}`
                    : "Not earned yet"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Badges populate as call, training, and roleplay milestones are completed."
            title="No badges yet"
          />
        )}
      </SurfacePanel>
    </div>
  );
}

/* ── Manager Dashboard ──────────────────────────────────────────── */

function ManagerDashboardView({
  leaderboard,
  managerDashboard,
  setupStatus,
}: {
  leaderboard: DashboardLeaderboard | null;
  managerDashboard: ManagerDashboard | null;
  setupStatus: Awaited<ReturnType<typeof getSetupStatus>>;
}) {
  const reps = managerDashboard?.reps ?? [];

  return (
    <div className="space-y-8">
      {/* Row 1: Operating pulse + Org Setup */}
      <div className="grid grid-cols-12 gap-6">
        <OperatingPulseCard />

        <OrgSetupCard setupStatus={setupStatus} />
      </div>

      {/* Row 2: Rep Performance */}
      <RepPerformanceSection reps={reps} />

      {/* Row 3: Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Team Avg Score" value={managerDashboard?.teamAvgScore ?? "—"} unit="/ 100" />
        <MetricCard label="Total Calls" value={managerDashboard?.totalCallsThisMonth ?? 0} />
        <MetricCard label="Active Reps" value={reps.length} />
        <MetricCard label="Coaching Flags" value={managerDashboard?.coachingFlagsCount ?? 0} />
      </div>

      {/* Row 4: Leaderboard columns */}
      <LeaderboardColumns leaderboard={leaderboard} />
    </div>
  );
}

/* ── Executive Dashboard ────────────────────────────────────────── */

function ExecutiveDashboardView({
  executiveDashboard,
  leaderboard,
  managerDashboard,
  setupStatus,
}: {
  executiveDashboard: ExecutiveDashboard | null;
  leaderboard: DashboardLeaderboard | null;
  managerDashboard: ManagerDashboard | null;
  setupStatus: Awaited<ReturnType<typeof getSetupStatus>>;
}) {
  const reps = managerDashboard?.reps ?? [];
  const repSkillBreakdown = executiveDashboard?.repSkillBreakdown ?? [];
  const trainingStats = executiveDashboard?.trainingStats;
  const skillAveragesLabel = executiveDashboard?.categoryAnalyticsContextLabel ?? null;
  const dynamicSkillColumns = executiveDashboard?.skillColumns ?? [];
  const hasDynamicSkillMatrix =
    dynamicSkillColumns.length > 0 &&
    repSkillBreakdown.some((rep) => (rep.skillBreakdown?.length ?? 0) > 0);

  return (
    <div className="space-y-8">
      {/* Row 1: Operating pulse + Org Setup */}
      <div className="grid grid-cols-12 gap-6">
        <OperatingPulseCard />

        <OrgSetupCard setupStatus={setupStatus} />
      </div>

      {/* Row 2: Rep Performance */}
      <RepPerformanceSection reps={reps} />

      {/* Row 3: Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Team Avg Score" value={managerDashboard?.teamAvgScore ?? "—"} unit="/ 100" />
        <MetricCard label="Total Calls" value={managerDashboard?.totalCallsThisMonth ?? 0} />
        <MetricCard
          label="Training Completion"
          value={trainingStats ? `${trainingStats.completionRate}%` : "—"}
        />
        <MetricCard label="Coaching Flags" value={managerDashboard?.coachingFlagsCount ?? 0} />
      </div>

      {/* Row 4: Leaderboard columns */}
      <LeaderboardColumns leaderboard={leaderboard} />

      {/* Row 5: Org Skill Averages + Call Volume */}
      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <SurfacePanel title="Org Skill Averages" link={{ href: "/training", label: "Open training" }}>
          {skillAveragesLabel ? (
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[var(--forge-gold)]">
              {skillAveragesLabel}
            </p>
          ) : null}
          {executiveDashboard?.skillAverages?.some((s) => s.avgScore !== null) ? (
            <div className="space-y-3">
              {executiveDashboard.skillAverages.map((skill) => (
                <BarRow
                  key={skill.category}
                  label={skill.category}
                  tone={scoreColor(skill.avgScore)}
                  value={skill.avgScore}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Org skill averages appear once scored calls exist across the team."
              title="No skill averages yet"
            />
          )}
        </SurfacePanel>

        <SurfacePanel title="Call Volume" link={{ href: "/calls", label: "Open call library" }}>
          {executiveDashboard?.weeklyCallVolume?.some((w) => w.callCount > 0) ? (
            <div className="flex h-48 items-end gap-2">
              {executiveDashboard.weeklyCallVolume.map((week) => {
                const max = Math.max(...executiveDashboard.weeklyCallVolume.map((w) => w.callCount), 1);
                const pct = Math.max(8, Math.round((week.callCount / max) * 100));
                return (
                  <div className="flex flex-1 flex-col items-center gap-2" key={week.week}>
                    <div className="flex h-36 w-full items-end">
                      <div
                        className="w-full rounded-t-md bg-[var(--forge-gold)]/60 transition hover:bg-[var(--forge-gold)]/80"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--forge-muted)]">
                      {new Date(week.week).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              description="Weekly call volume appears after calls are uploaded and scored."
              title="No call volume yet"
            />
          )}
        </SurfacePanel>
      </div>

      {/* Row 6: Rep Skill Matrix */}
      {repSkillBreakdown.length > 0 && (
        <SurfacePanel title="Rep Skill Matrix" link={{ href: "/team", label: "View team" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[var(--forge-border-strong)]/20 text-[var(--forge-muted)]">
                  <th className="pb-3 text-left font-medium">Rep</th>
                  <th className="pb-3 text-center font-medium">Overall</th>
                  {hasDynamicSkillMatrix ? (
                    dynamicSkillColumns.map((column) => (
                      <th className="pb-3 text-center font-medium" key={column}>{column}</th>
                    ))
                  ) : (
                    <>
                      <th className="pb-3 text-center font-medium">Frame</th>
                      <th className="pb-3 text-center font-medium">Rapport</th>
                      <th className="pb-3 text-center font-medium">Discovery</th>
                      <th className="pb-3 text-center font-medium">Pain</th>
                      <th className="pb-3 text-center font-medium">Solution</th>
                      <th className="pb-3 text-center font-medium">Objection</th>
                      <th className="pb-3 text-center font-medium">Closing</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {repSkillBreakdown.map((rep) => (
                  <tr className="border-b border-[var(--forge-border-strong)]/10 last:border-b-0" key={rep.repId}>
                    <td className="py-3 pr-4">
                      <Link className="font-medium text-[var(--forge-text)] hover:text-[var(--forge-gold)]" href={`/team/${rep.repId}`}>
                        {[rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                      </Link>
                    </td>
                    <td className={`py-3 text-center font-semibold ${scoreColor(rep.compositeScore)}`}>{rep.compositeScore ?? "—"}</td>
                    {hasDynamicSkillMatrix ? (
                      dynamicSkillColumns.map((column) => {
                        const score = rep.skillBreakdown?.find((entry) => entry.category === column)?.avgScore ?? null;
                        return (
                          <td className={`py-3 text-center ${scoreColor(score)}`} key={`${rep.repId}-${column}`}>
                            {score ?? "—"}
                          </td>
                        );
                      })
                    ) : (
                      <>
                        <td className={`py-3 text-center ${scoreColor(rep.skills.frameControl)}`}>{rep.skills.frameControl ?? "—"}</td>
                        <td className={`py-3 text-center ${scoreColor(rep.skills.rapport)}`}>{rep.skills.rapport ?? "—"}</td>
                        <td className={`py-3 text-center ${scoreColor(rep.skills.discovery)}`}>{rep.skills.discovery ?? "—"}</td>
                        <td className={`py-3 text-center ${scoreColor(rep.skills.painExpansion)}`}>{rep.skills.painExpansion ?? "—"}</td>
                        <td className={`py-3 text-center ${scoreColor(rep.skills.solution)}`}>{rep.skills.solution ?? "—"}</td>
                        <td className={`py-3 text-center ${scoreColor(rep.skills.objection)}`}>{rep.skills.objection ?? "—"}</td>
                        <td className={`py-3 text-center ${scoreColor(rep.skills.closing)}`}>{rep.skills.closing ?? "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfacePanel>
      )}
    </div>
  );
}

/* ── Shared sub-components ──────────────────────────────────────── */

function OperatingPulseCard() {
  return (
    <ForgeWidget
      className="col-span-12 lg:col-span-8"
      eyebrow="Dashboard OS"
      title="Operating pulse"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr,auto] lg:items-end">
        <p className="max-w-2xl text-sm leading-7 text-[var(--forge-muted)]">
          Current team activity, leaderboard movement, call intake, and setup health for this cycle.
        </p>
        <div className="flex flex-wrap gap-3">
          <ForgeButton href="/team" icon="group" variant="primary">
            Open team
          </ForgeButton>
          <ForgeButton href="/leaderboard" icon="leaderboard" variant="secondary">
            View ranks
          </ForgeButton>
          <ForgeButton href="/upload" icon="cloud_upload" variant="ghost">
            Upload call
          </ForgeButton>
        </div>
      </div>
    </ForgeWidget>
  );
}

function OrgSetupCard({
  setupStatus,
}: {
  setupStatus: Awaited<ReturnType<typeof getSetupStatus>>;
}) {
  return (
    <ForgeWidget className="col-span-12 lg:col-span-4" eyebrow="Workspace" title="Setup health">
      <div className="mb-4 flex items-center justify-between">
        {setupStatus?.orgSlug && (
          <div className="flex items-center gap-2 px-2 py-1 bg-[var(--forge-surface-2)] rounded-md border border-[var(--forge-border-strong)]/20">
            <ForgeIcon className="text-[var(--forge-gold)]" name="fingerprint" size={14} />
            <code className="text-[10px] text-[var(--forge-muted)] font-mono">{setupStatus.orgSlug}</code>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="flex justify-between items-center py-2 border-b border-[var(--forge-border-strong)]/10">
          <span className="text-[var(--forge-muted)] text-sm">Reps</span>
          <span className="text-[var(--forge-gold)] font-bold">{setupStatus?.repsCount ?? 0}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[var(--forge-border-strong)]/10">
          <span className="text-[var(--forge-muted)] text-sm">Calls</span>
          <span className="text-[var(--forge-gold)] font-bold">{setupStatus?.callsCount ?? 0}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-[var(--forge-muted)] text-sm">Roleplay</span>
          <span className="text-[var(--forge-gold)] font-bold">{setupStatus?.roleplayCount ?? 0}</span>
        </div>
      </div>
    </ForgeWidget>
  );
}

function RepPerformanceSection({ reps }: { reps: ManagerDashboard["reps"] }) {
  if (!reps.length) {
    return (
      <ForgeWidget eyebrow="People" title="Rep Performance">
        <ForgeEmptyStatePrimitive
          description="Once reps and scored calls exist in this org, the coaching roster appears here."
          icon="monitoring"
          title="No rep performance yet"
        />
      </ForgeWidget>
    );
  }

  return (
    <SurfacePanel title="Rep Performance" link={{ href: "/team", label: "Open team" }}>
      <div className="grid gap-3 md:grid-cols-2">
        {reps.map((rep) => (
          <Link
            className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4 transition hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/5"
            href={`/team/${rep.id}`}
            key={rep.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--forge-text)]">
                  {[rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                </p>
                <p className="mt-1 text-xs text-[var(--forge-muted)]">{rep.callCount} scored calls</p>
              </div>
              <span className={`text-lg font-bold ${scoreColor(rep.compositeScore)}`}>
                {rep.compositeScore ?? "—"}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="uppercase tracking-[0.2em] text-[var(--forge-muted)]">Week over week</span>
              <span
                className={
                  rep.weekOverWeekDelta === null
                    ? "text-[var(--forge-muted)]"
                    : rep.weekOverWeekDelta < 0
                      ? "text-[var(--forge-danger)]"
                      : "text-[var(--forge-success)]"
                }
              >
                {rep.weekOverWeekDelta === null ? "—" : formatDelta(rep.weekOverWeekDelta)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </SurfacePanel>
  );
}

function LeaderboardColumns({ leaderboard }: { leaderboard: DashboardLeaderboard | null }) {
  const groups = [
    { key: "topQuality", title: "Top Quality", icon: "stars" },
    { key: "topVolume", title: "Top Volume", icon: "bar_chart" },
    { key: "mostImproved", title: "Most Improved", icon: "trending_up" },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {groups.map((group) => {
        const entries = leaderboard?.[group.key] ?? [];
        return (
          <ForgeWidget
            key={group.key}
            eyebrow="Ranks"
            title={group.title}
          >
            {entries.length ? (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <Link
                    className="flex items-center justify-between gap-3 hover:text-[var(--forge-gold)]"
                    href={`/team/${entry.userId}`}
                    key={entry.userId}
                  >
                    <p className="text-sm font-medium text-[var(--forge-text)]">
                      {entry.rank}. {[entry.firstName, entry.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                    </p>
                    <span className={`text-sm font-semibold ${scoreColor(entry.value)}`}>
                      {entry.value ?? "—"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Rankings populate once reps have scored calls in this workspace."
                title="No data yet"
              />
            )}
          </ForgeWidget>
        );
      })}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <ForgeMetric
      description={unit ? unit : undefined}
      label={label}
      tone="cyan"
      value={value}
    />
  );
}

function SurfacePanel({
  children,
  link,
  title,
}: {
  children: ReactNode;
  link?: { href: string; label: string };
  title: string;
}) {
  return (
    <ForgeWidget action={link} title={title}>
      {children}
    </ForgeWidget>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <ForgeEmptyStatePrimitive description={description} title={title} />
  );
}

function BarRow({ label, tone, value }: { label: string; tone: string; value: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm text-[var(--forge-muted)]">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--forge-surface-3)]">
        <div
          className={`h-full rounded-full ${barColor(tone)}`}
          style={{ width: `${Math.max(0, Math.min(value ?? 0, 100))}%` }}
        />
      </div>
      <span className={`w-10 text-right text-sm font-semibold ${tone}`}>{value ?? "—"}</span>
    </div>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function scoreColor(value: number | null | undefined) {
  if (typeof value !== "number") return "text-[var(--forge-muted)]";
  if (value >= 85) return "text-[var(--forge-success)]";
  if (value >= 70) return "text-[var(--forge-gold)]";
  if (value >= 60) return "text-[var(--forge-ember)]";
  return "text-[var(--forge-danger)]";
}

function barColor(tone: string) {
  if (tone.includes("success")) return "bg-[var(--forge-success)]";
  if (tone.includes("ember")) return "bg-[var(--forge-ember)]";
  if (tone.includes("danger")) return "bg-[var(--forge-danger)]";
  return "bg-[var(--forge-gold)]";
}
