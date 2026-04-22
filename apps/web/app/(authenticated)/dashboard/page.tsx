import type { ReactNode } from "react";
import Link from "next/link";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  getCurrentUserProfile,
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

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser ? await getCurrentUserProfile(repository, authUser.id) : null;

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
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4 transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/5"
                  href={`/calls/${call.id}`}
                  key={call.id}
                >
                  <div>
                    <p className="text-sm font-medium text-[#ecedf6]">
                      {call.callTopic ?? "Untitled call"}
                    </p>
                    <p className="mt-1 text-xs text-[#a9abb3]">{formatTimestamp(call.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${scoreColor(call.overallScore)}`}>
                      {call.overallScore ?? "—"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#a9abb3]">
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
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[#74b1ff]">
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
                    ? "border-amber-500/25 bg-amber-500/5"
                    : "border-[#45484f]/20 bg-[#161a21]/50 opacity-70"
                }`}
                key={badge.id}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{badge.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#ecedf6]">{badge.name}</p>
                    <p className="mt-1 text-xs text-[#a9abb3]">{badge.description}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium text-[#a9abb3]">
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
      {/* Row 1: CTA card + Org Setup */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-[#10131a] rounded-xl p-6 border border-[#45484f]/10 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold mb-2 text-[#ecedf6]">Live team snapshot</h3>
                <p className="text-[#a9abb3] text-sm max-w-md">
                  Current team activity, leaderboard movement, and setup status for this cycle.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-auto">
              <Link
                href="/team"
                className="px-6 py-3 bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] text-[#002345] font-bold rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm"
              >
                Open team
              </Link>
              <Link
                href="/leaderboard"
                className="px-6 py-3 bg-[#22262f] border border-[#45484f]/20 text-[#ecedf6] font-bold rounded-lg hover:bg-[#282c36] active:scale-95 transition-all text-sm"
              >
                View leaderboard
              </Link>
              <Link
                href="/upload"
                className="px-6 py-3 bg-transparent text-[#74b1ff] hover:text-[#54a3ff] font-bold rounded-lg transition-all text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
                Upload call
              </Link>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#74b1ff]/5 rounded-full blur-[80px]" />
        </div>

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
      {/* Row 1: CTA card + Org Setup */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-[#10131a] rounded-xl p-6 border border-[#45484f]/10 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold mb-2 text-[#ecedf6]">Live team snapshot</h3>
                <p className="text-[#a9abb3] text-sm max-w-md">
                  Current team activity, leaderboard movement, and setup status for this cycle.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-auto">
              <Link
                href="/team"
                className="px-6 py-3 bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] text-[#002345] font-bold rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm"
              >
                Open team
              </Link>
              <Link
                href="/leaderboard"
                className="px-6 py-3 bg-[#22262f] border border-[#45484f]/20 text-[#ecedf6] font-bold rounded-lg hover:bg-[#282c36] active:scale-95 transition-all text-sm"
              >
                View leaderboard
              </Link>
              <Link
                href="/upload"
                className="px-6 py-3 bg-transparent text-[#74b1ff] hover:text-[#54a3ff] font-bold rounded-lg transition-all text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
                Upload call
              </Link>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#74b1ff]/5 rounded-full blur-[80px]" />
        </div>

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
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[#74b1ff]">
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
                        className="w-full rounded-t-md bg-[#74b1ff]/60 transition hover:bg-[#74b1ff]/80"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#a9abb3]">
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
                <tr className="border-b border-[#45484f]/20 text-[#a9abb3]">
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
                  <tr className="border-b border-[#45484f]/10 last:border-b-0" key={rep.repId}>
                    <td className="py-3 pr-4">
                      <Link className="font-medium text-[#ecedf6] hover:text-[#74b1ff]" href={`/team/${rep.repId}`}>
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

function OrgSetupCard({
  setupStatus,
}: {
  setupStatus: Awaited<ReturnType<typeof getSetupStatus>>;
}) {
  return (
    <div className="col-span-12 lg:col-span-4 bg-[#10131a] rounded-xl p-6 flex flex-col border border-[#45484f]/10">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a9abb3]">
          Org Setup
        </span>
        {setupStatus?.orgSlug && (
          <div className="flex items-center gap-2 px-2 py-1 bg-[#161a21] rounded-md border border-[#45484f]/20">
            <span className="material-symbols-outlined text-[#74b1ff]" style={{ fontSize: "14px" }}>
              fingerprint
            </span>
            <code className="text-[10px] text-[#a9abb3] font-mono">{setupStatus.orgSlug}</code>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="flex justify-between items-center py-2 border-b border-[#45484f]/10">
          <span className="text-[#a9abb3] text-sm">Reps</span>
          <span className="text-[#74b1ff] font-bold">{setupStatus?.repsCount ?? 0}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#45484f]/10">
          <span className="text-[#a9abb3] text-sm">Calls</span>
          <span className="text-[#74b1ff] font-bold">{setupStatus?.callsCount ?? 0}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-[#a9abb3] text-sm">Roleplay</span>
          <span className="text-[#74b1ff] font-bold">{setupStatus?.roleplayCount ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

function RepPerformanceSection({ reps }: { reps: ManagerDashboard["reps"] }) {
  if (!reps.length) {
    return (
      <div className="bg-[#10131a] border-2 border-[#74b1ff]/20 rounded-3xl p-16 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-[0_0_50px_-12px_rgba(116,177,255,0.15)]">
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-full bg-[#74b1ff]/10 flex items-center justify-center mb-8 mx-auto ring-4 ring-[#74b1ff]/5">
            <span className="material-symbols-outlined text-[#74b1ff]" style={{ fontSize: "40px" }}>
              monitoring
            </span>
          </div>
          <h3 className="text-3xl font-bold mb-4 text-[#ecedf6]">Rep Performance</h3>
          <p className="text-[#a9abb3] max-w-xl text-lg leading-relaxed">
            No rep performance yet. Once reps and scored calls exist in this org, the coaching roster appears here.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <div className="px-4 py-2 rounded-full border border-[#45484f]/20 text-[0.65rem] font-bold uppercase tracking-widest text-[#a9abb3]/60 bg-[#161a21]/30">
              Central Hub for Growth
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#74b1ff]/5 to-transparent" />
      </div>
    );
  }

  return (
    <SurfacePanel title="Rep Performance" link={{ href: "/team", label: "Open team" }}>
      <div className="grid gap-3 md:grid-cols-2">
        {reps.map((rep) => (
          <Link
            className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4 transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/5"
            href={`/team/${rep.id}`}
            key={rep.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#ecedf6]">
                  {[rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                </p>
                <p className="mt-1 text-xs text-[#a9abb3]">{rep.callCount} scored calls</p>
              </div>
              <span className={`text-lg font-bold ${scoreColor(rep.compositeScore)}`}>
                {rep.compositeScore ?? "—"}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="uppercase tracking-[0.2em] text-[#a9abb3]">Week over week</span>
              <span
                className={
                  rep.weekOverWeekDelta === null
                    ? "text-[#a9abb3]"
                    : rep.weekOverWeekDelta < 0
                      ? "text-red-400"
                      : "text-emerald-400"
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
          <div
            key={group.key}
            className="bg-[#10131a] rounded-xl p-6 border border-[#45484f]/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-[#6dddff]" style={{ fontSize: "20px" }}>
                {group.icon}
              </span>
              <h4 className="font-bold uppercase text-xs tracking-widest text-[#ecedf6]">
                {group.title}
              </h4>
            </div>
            {entries.length ? (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <Link
                    className="flex items-center justify-between gap-3 hover:text-[#74b1ff]"
                    href={`/team/${entry.userId}`}
                    key={entry.userId}
                  >
                    <p className="text-sm font-medium text-[#ecedf6]">
                      {entry.rank}. {[entry.firstName, entry.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                    </p>
                    <span className={`text-sm font-semibold ${scoreColor(entry.value)}`}>
                      {entry.value ?? "—"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center border border-dashed border-[#45484f]/20 rounded-lg bg-[#161a21]/20">
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-[#a9abb3]/40 font-bold">
                  No data yet
                </span>
              </div>
            )}
          </div>
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
    <div className="bg-[#10131a] p-6 rounded-xl border border-[#45484f]/10">
      <p className="text-xs font-bold uppercase tracking-widest text-[#a9abb3] mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-[#74b1ff]" style={{ textShadow: "0 0 12px rgba(116, 177, 255, 0.4)" }}>
          {value}
        </span>
        {unit && <span className="text-[#a9abb3] text-sm">{unit}</span>}
      </div>
    </div>
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
    <section className="bg-[#10131a] rounded-xl p-6 border border-[#45484f]/10">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h3 className="text-lg font-bold text-[#ecedf6]">{title}</h3>
        {link ? (
          <Link className="text-sm font-medium text-[#74b1ff] hover:text-[#54a3ff] transition" href={link.href}>
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#45484f]/20 bg-[#161a21]/20 px-5 py-8 text-center">
      <p className="text-lg font-medium text-[#ecedf6]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#a9abb3]">{description}</p>
    </div>
  );
}

function BarRow({ label, tone, value }: { label: string; tone: string; value: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm text-[#a9abb3]">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#22262f]">
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
  if (typeof value !== "number") return "text-[#a9abb3]";
  if (value >= 85) return "text-emerald-400";
  if (value >= 70) return "text-[#74b1ff]";
  if (value >= 60) return "text-amber-400";
  return "text-red-400";
}

function barColor(tone: string) {
  if (tone.includes("emerald")) return "bg-emerald-400";
  if (tone.includes("amber")) return "bg-amber-400";
  if (tone.includes("red")) return "bg-red-400";
  return "bg-[#74b1ff]";
}
