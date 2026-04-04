import type { ReactNode } from "react";
import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
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

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser ? await getCurrentUserProfile(repository, authUser.id) : null;

  if (!authUser || !profile) {
    return (
      <PageFrame
        tone="warning"
        description="This account is authenticated but is not provisioned inside the Argos app database yet."
        eyebrow="Provisioning"
        title="Dashboard unavailable"
      >
        <EmptyPanel
          description="Complete app provisioning first, then reload this route to unlock the product dashboards."
          title="User record missing"
        />
      </PageFrame>
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

  const title = isExecutive ? "Executive Dashboard" : isManager ? "Team Dashboard" : "My Dashboard";
  const description = isExecutive
    ? "Org-wide analytics, training completion, and rep skill distribution now load from live Argos data."
    : isManager
      ? "Team performance, coaching risk, and leaderboard slices now load from live org data instead of placeholder summaries."
      : "Your scoring trends, focus categories, badges, and recent calls now load from live Argos data.";
  const actions = isManager
    ? [
        { href: "/team", label: "Open team" },
        { href: "/leaderboard", label: "View leaderboard" },
        { href: "/upload", label: "Upload call" },
      ]
    : [
        { href: "/upload", label: "Upload call" },
        { href: "/calls", label: "Open call library" },
        { href: "/training", label: "Training" },
      ];

  return (
    <PageFrame
      actions={actions}
      description={description}
      eyebrow="Command"
      title={title}
    >
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
    </PageFrame>
  );
}

function RepDashboardView({
  badges,
  dashboard,
}: {
  badges: Badge[];
  dashboard: RepDashboard | null;
}) {
  const recentCalls = dashboard?.recentCalls ?? [];
  const focusAreas = dashboard?.lowestCategories ?? [];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="30-day average"
          sublabel="your scored calls"
          value={dashboard?.monthlyAvgScore ?? "—"}
        />
        <MetricCard
          label="Calls analyzed"
          sublabel="recent call entries"
          value={recentCalls.length}
        />
        <MetricCard
          label="Focus categories"
          sublabel="lowest scoring skills"
          value={focusAreas.length}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Panel title="Recent Calls" link={{ href: "/calls", label: "View all" }}>
          {recentCalls.length ? (
            <div className="space-y-3">
              {recentCalls.map((call) => (
                <Link
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/30 px-4 py-4 transition hover:border-blue-500/30 hover:bg-blue-600/5"
                  href={`/calls/${call.id}`}
                  key={call.id}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {call.callTopic ?? "Untitled call"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatTimestamp(call.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${scoreColor(call.overallScore)}`}>
                      {call.overallScore ?? "—"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {call.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel
              description="Upload a call to create a scored record, highlights, and coaching feedback."
              title="No recent calls"
            />
          )}
        </Panel>

        <Panel title="Focus Areas" link={{ href: "/training", label: "Open training" }}>
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
            <EmptyPanel
              description="Your lowest categories appear here once scored calls are available."
              title="No focus data"
            />
          )}
        </Panel>
      </section>

      <Panel title="Badges & Milestones" link={{ href: "/training", label: "Keep progressing" }}>
        {badges.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {badges.map((badge) => (
              <article
                className={`rounded-2xl border px-4 py-4 ${
                  badge.earned
                    ? "border-amber-500/25 bg-amber-500/5"
                    : "border-slate-800/70 bg-slate-950/30 opacity-70"
                }`}
                key={badge.id}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{badge.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{badge.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{badge.description}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-400">
                  {badge.earned && badge.earnedAt
                    ? `Earned ${formatTimestamp(badge.earnedAt)}`
                    : "Not earned yet"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel description="Badges populate as call, training, and roleplay milestones are completed." title="No badges yet" />
        )}
      </Panel>
    </div>
  );
}

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
    <div className="space-y-5">
      <SetupStatusPanel setupStatus={setupStatus} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Team avg score"
          sublabel="this month"
          value={managerDashboard?.teamAvgScore ?? "—"}
        />
        <MetricCard
          label="Total calls"
          sublabel="this month"
          value={managerDashboard?.totalCallsThisMonth ?? 0}
        />
        <MetricCard label="Active reps" sublabel="visible roster" value={reps.length} />
        <MetricCard
          label="Coaching flags"
          sublabel="need attention"
          value={managerDashboard?.coachingFlagsCount ?? 0}
          accent={managerDashboard?.coachingFlagsCount ? "amber" : "slate"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <Panel title="Rep Performance" link={{ href: "/team", label: "Open team" }}>
          {reps.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {reps.map((rep) => (
                <Link
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/30 px-4 py-4 transition hover:border-blue-500/30 hover:bg-blue-600/5"
                  href={`/team/${rep.id}`}
                  key={rep.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {[rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{rep.callCount} scored calls</p>
                    </div>
                    <span className={`text-lg font-bold ${scoreColor(rep.compositeScore)}`}>
                      {rep.compositeScore ?? "—"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="uppercase tracking-[0.2em] text-slate-500">Week over week</span>
                    <span
                      className={
                        rep.weekOverWeekDelta === null
                          ? "text-slate-500"
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
          ) : (
            <EmptyPanel description="Once reps and scored calls exist in this org, the coaching roster appears here." title="No rep performance yet" />
          )}
        </Panel>

        <LeaderboardColumns leaderboard={leaderboard} />
      </section>
    </div>
  );
}

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
  const trainingStats = executiveDashboard?.trainingStats;
  const repSkillBreakdown = executiveDashboard?.repSkillBreakdown ?? [];

  return (
    <div className="space-y-5">
      <SetupStatusPanel setupStatus={setupStatus} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Team avg score"
          sublabel="this month"
          value={managerDashboard?.teamAvgScore ?? "—"}
        />
        <MetricCard
          label="Total calls"
          sublabel="this month"
          value={managerDashboard?.totalCallsThisMonth ?? 0}
        />
        <MetricCard
          label="Training completion"
          sublabel={`${trainingStats?.totalPassed ?? 0} of ${trainingStats?.totalAssigned ?? 0} passed`}
          value={trainingStats ? `${trainingStats.completionRate}%` : "—"}
          accent="emerald"
        />
        <MetricCard
          label="Coaching flags"
          sublabel="need attention"
          value={managerDashboard?.coachingFlagsCount ?? 0}
          accent={managerDashboard?.coachingFlagsCount ? "amber" : "slate"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <Panel title="Org Skill Averages" link={{ href: "/training", label: "Open training" }}>
          {executiveDashboard?.skillAverages?.some((skill) => skill.avgScore !== null) ? (
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
            <EmptyPanel description="Org skill averages appear once scored calls exist across the team." title="No skill averages yet" />
          )}
        </Panel>

        <Panel title="Call Volume" link={{ href: "/calls", label: "Open call library" }}>
          {executiveDashboard?.weeklyCallVolume?.some((week) => week.callCount > 0) ? (
            <div className="flex h-48 items-end gap-2">
              {executiveDashboard.weeklyCallVolume.map((week) => (
                <div className="flex flex-1 flex-col items-center gap-2" key={week.week}>
                  <div className="flex h-36 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-blue-500/60 transition hover:bg-blue-500/80"
                      style={{
                        height: `${Math.max(
                          8,
                          Math.round(
                            (week.callCount /
                              Math.max(
                                ...executiveDashboard.weeklyCallVolume.map((item) => item.callCount),
                                1,
                              )) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(week.week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel description="Weekly call volume appears after calls are uploaded and scored." title="No call volume yet" />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Panel title="Rep Skill Matrix" link={{ href: "/team", label: "View team" }}>
          {repSkillBreakdown.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800/70 text-slate-500">
                    <th className="pb-3 text-left font-medium">Rep</th>
                    <th className="pb-3 text-center font-medium">Overall</th>
                    <th className="pb-3 text-center font-medium">Frame</th>
                    <th className="pb-3 text-center font-medium">Rapport</th>
                    <th className="pb-3 text-center font-medium">Discovery</th>
                    <th className="pb-3 text-center font-medium">Pain</th>
                    <th className="pb-3 text-center font-medium">Solution</th>
                    <th className="pb-3 text-center font-medium">Objection</th>
                    <th className="pb-3 text-center font-medium">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {repSkillBreakdown.map((rep) => (
                    <tr className="border-b border-slate-900/70 last:border-b-0" key={rep.repId}>
                      <td className="py-3 pr-4">
                        <Link className="font-medium text-slate-100 hover:text-blue-300" href={`/team/${rep.repId}`}>
                          {[rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                        </Link>
                      </td>
                      <td className={`py-3 text-center font-semibold ${scoreColor(rep.compositeScore)}`}>{rep.compositeScore ?? "—"}</td>
                      <td className={`py-3 text-center ${scoreColor(rep.skills.frameControl)}`}>{rep.skills.frameControl ?? "—"}</td>
                      <td className={`py-3 text-center ${scoreColor(rep.skills.rapport)}`}>{rep.skills.rapport ?? "—"}</td>
                      <td className={`py-3 text-center ${scoreColor(rep.skills.discovery)}`}>{rep.skills.discovery ?? "—"}</td>
                      <td className={`py-3 text-center ${scoreColor(rep.skills.painExpansion)}`}>{rep.skills.painExpansion ?? "—"}</td>
                      <td className={`py-3 text-center ${scoreColor(rep.skills.solution)}`}>{rep.skills.solution ?? "—"}</td>
                      <td className={`py-3 text-center ${scoreColor(rep.skills.objection)}`}>{rep.skills.objection ?? "—"}</td>
                      <td className={`py-3 text-center ${scoreColor(rep.skills.closing)}`}>{rep.skills.closing ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel description="Rep skill breakdowns populate when scored calls exist for the org." title="No rep skill data yet" />
          )}
        </Panel>

        <LeaderboardColumns leaderboard={leaderboard} compact />
      </section>
    </div>
  );
}

function SetupStatusPanel({
  setupStatus,
}: {
  setupStatus: Awaited<ReturnType<typeof getSetupStatus>>;
}) {
  if (!setupStatus) {
    return null;
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">Org Setup</p>
          <p className="mt-2 text-xl font-semibold text-white">{setupStatus.orgSlug || "Unslugged org"}</p>
          <p className="mt-1 text-sm text-slate-400">Provisioning status for reps, calls, and roleplay sessions.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <SetupCount label="Reps" value={setupStatus.repsCount} />
          <SetupCount label="Calls" value={setupStatus.callsCount} />
          <SetupCount label="Roleplay" value={setupStatus.roleplayCount} />
        </div>
      </div>
    </section>
  );
}

function SetupCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function LeaderboardColumns({
  leaderboard,
  compact = false,
}: {
  leaderboard: DashboardLeaderboard | null;
  compact?: boolean;
}) {
  const groups = [
    { key: "topQuality", title: "Top Quality" },
    { key: "topVolume", title: "Top Volume" },
    { key: "mostImproved", title: "Most Improved" },
  ] as const;

  return (
    <Panel title="Leaderboard Snapshots" link={{ href: "/leaderboard", label: "Open full leaderboard" }}>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-3"}`}>
        {groups.map((group) => {
          const entries = leaderboard?.[group.key] ?? [];

          return (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4" key={group.key}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{group.title}</p>
              {entries.length ? (
                <div className="mt-4 space-y-3">
                  {entries.map((entry) => (
                    <Link className="flex items-center justify-between gap-3 hover:text-blue-300" href={`/team/${entry.userId}`} key={entry.userId}>
                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          {entry.rank}. {[entry.firstName, entry.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${scoreColor(entry.value)}`}>{entry.value ?? "—"}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No data yet</p>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function MetricCard({
  label,
  sublabel,
  value,
  accent = "blue",
}: {
  label: string;
  sublabel: string;
  value: number | string;
  accent?: "amber" | "blue" | "emerald" | "slate";
}) {
  const tone =
    accent === "amber"
      ? "text-amber-400"
      : accent === "emerald"
        ? "text-emerald-400"
        : accent === "slate"
          ? "text-slate-200"
          : "text-blue-400";

  return (
    <article className="rounded-[1.5rem] border border-slate-800/70 bg-[#0c1629] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.22)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className={`mt-4 text-4xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-500">{sublabel}</p>
    </article>
  );
}

function Panel({
  children,
  link,
  title,
}: {
  children: ReactNode;
  link?: { href: string; label: string };
  title: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.22)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {link ? (
          <Link className="text-sm font-medium text-blue-300 transition hover:text-blue-200" href={link.href}>
            {link.label}
          </Link>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BarRow({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: number | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm text-slate-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${barColor(tone)}`}
          style={{ width: `${Math.max(0, Math.min(value ?? 0, 100))}%` }}
        />
      </div>
      <span className={`w-10 text-right text-sm font-semibold ${tone}`}>{value ?? "—"}</span>
    </div>
  );
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-5 py-8 text-center">
      <p className="text-lg font-medium text-slate-200">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">{description}</p>
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
  if (typeof value !== "number") {
    return "text-slate-400";
  }

  if (value >= 85) {
    return "text-emerald-400";
  }

  if (value >= 70) {
    return "text-blue-300";
  }

  if (value >= 60) {
    return "text-amber-400";
  }

  return "text-red-400";
}

function barColor(tone: string) {
  if (tone.includes("emerald")) {
    return "bg-emerald-400";
  }

  if (tone.includes("amber")) {
    return "bg-amber-400";
  }

  if (tone.includes("red")) {
    return "bg-red-400";
  }

  return "bg-blue-400";
}
