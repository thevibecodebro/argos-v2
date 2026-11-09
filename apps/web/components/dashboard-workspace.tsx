import Link from "next/link";
import type { Badge, ExecutiveDashboard, ManagerDashboard, RepDashboard, getSetupStatus } from "@/lib/dashboard/service";
import { ForgeChip, type ForgeTone } from "./forge";
import { WorkspacePageHeader } from "./workspace-page-header";
import styles from "./review-workspace.module.css";

function scoreMetricTone(value: number | null | undefined): ForgeTone {
  if (typeof value !== "number") return "muted";
  if (value >= 85) return "success";
  if (value >= 70) return "gold";
  if (value >= 60) return "ember";
  return "danger";
}

function toneTextClass(tone: ForgeTone) {
  if (tone === "success") return "text-[var(--forge-success)]";
  if (tone === "danger") return "text-[var(--forge-danger)]";
  if (tone === "ember") return "text-[var(--forge-ember)]";
  if (tone === "cyan") return "text-[var(--forge-cyan)]";
  if (tone === "muted") return "text-[var(--forge-text)]";
  return "text-[var(--forge-gold)]";
}

type TodayStat = {
  hint: string;
  label: string;
  tone: ForgeTone;
  value: string;
};

function buildTodayStats({
  badges,
  isManager,
  managerDashboard,
  repDashboard,
}: {
  badges: Badge[];
  isManager: boolean;
  managerDashboard: ManagerDashboard | null;
  repDashboard: RepDashboard | null;
}): TodayStat[] {
  if (isManager) {
    const avg = managerDashboard?.teamAvgScore ?? null;
    const flags = managerDashboard?.coachingFlagsCount ?? 0;
    const flaggedReps = (managerDashboard?.reps ?? []).filter(
      (rep) => rep.needsCoaching,
    ).length;
    return [
      {
        hint: "quality score",
        label: "Team avg",
        tone: scoreMetricTone(avg),
        value: avg != null ? String(avg) : "--",
      },
      {
        hint: "scored",
        label: "Calls this month",
        tone: "muted",
        value: String(managerDashboard?.totalCallsThisMonth ?? 0),
      },
      {
        hint: flaggedReps
          ? `across ${flaggedReps} rep${flaggedReps === 1 ? "" : "s"}`
          : "team on track",
        label: "Coaching flags",
        tone: flags > 0 ? "danger" : "success",
        value: String(flags),
      },
    ];
  }

  const recentCalls = repDashboard?.recentCalls ?? [];
  const focus = repDashboard?.lowestCategories?.[0] ?? null;
  const earned = badges.filter((badge) => badge.earned).length;
  return [
    {
      hint: "scored",
      label: "Recent calls",
      tone: "muted",
      value: String(recentCalls.length),
    },
    {
      hint: focus ? focus.category : "all on track",
      label: "Focus area",
      tone: focus ? scoreMetricTone(focus.avgScore) : "success",
      value: focus ? String(focus.avgScore) : "--",
    },
    {
      hint: "earned",
      label: "Badges",
      tone: "gold",
      value: String(earned),
    },
  ];
}

type TodayQueueItem = {
  actionLabel: string;
  description: string;
  href: string;
  icon: string;
  id: string;
  label: string;
  signal: string;
  statusLabel: string;
  tone: ForgeTone;
  typeLabel: string;
};

type SetupStatusResult = Awaited<ReturnType<typeof getSetupStatus>>;

export type DashboardWorkspaceProps = {
  badges: Badge[];
  executiveDashboard: ExecutiveDashboard | null;
  isExecutive: boolean;
  isManager: boolean;
  managerDashboard: ManagerDashboard | null;
  repDashboard: RepDashboard | null;
  setupStatus: SetupStatusResult;
  canUpload?: boolean;
  canTrain?: boolean;
  canPractice?: boolean;
  canBrand?: boolean;
  canManageWorkspace?: boolean;
};

export function DashboardWorkspace({ badges, executiveDashboard, isExecutive, isManager, managerDashboard, repDashboard, setupStatus, canUpload = true, canTrain = true, canPractice = true, canBrand = true, canManageWorkspace = false }: DashboardWorkspaceProps) {
  const canOpen = (href: string) => href === "/upload" ? canUpload : href === "/training" ? canTrain : href === "/roleplay" ? canPractice : href === "/settings/people" ? canManageWorkspace : true;
  const queueItems = buildTodayQueueItems({ badges, executiveDashboard, isExecutive, isManager, managerDashboard, repDashboard, setupStatus }).filter((item) => canOpen(item.href));
  const stats = buildTodayStats({ badges, isManager, managerDashboard, repDashboard });
  const setupChecklist = setupStatus ? [
    { done: setupStatus.callsCount > 0, href: "/upload", label: setupStatus.callsCount > 0 ? "Calls flowing" : "Upload your first call" },
    { done: setupStatus.repsCount > 1, href: "/settings/people", label: setupStatus.repsCount > 1 ? "Team invited" : "Invite your team" },
    { done: setupStatus.roleplayCount > 0, href: "/roleplay", label: setupStatus.roleplayCount > 0 ? "Practice started" : "Start a roleplay" },
  ].filter((step) => step.done || canOpen(step.href)) : [];
  return <div className={styles.page} data-operational-workspace="true" data-dashboard-route="dashboard" data-dashboard-today-queue="true">
    <WorkspacePageHeader title="Dashboard" description="Review what needs attention next." actions={<Link className={styles.secondaryButton} href={isManager ? "/team" : "/calls"}>{isManager ? "Team" : "Calls"}</Link>} />
    <section aria-labelledby="dashboard-attention-title">
      <div className={styles.listHeading}><h2 id="dashboard-attention-title">Needs attention</h2><span className={styles.muted}>{isExecutive ? "Executive view" : isManager ? "Manager view" : "Your work"}</span></div>
      <div className={styles.panel} data-dashboard-queue-table="true">
        {queueItems.length ? queueItems.map((item) => <article className={styles.queueRow} key={item.id} data-dashboard-queue-row="default">
          <div><h3>{item.label}</h3><p>{item.description}</p></div><div className={styles.queueSignal}><ForgeChip tone={item.tone}>{item.statusLabel}</ForgeChip><p>{item.signal}</p></div><Link className={`${styles.textLink} ${styles.queueAction}`} href={item.href}>{item.actionLabel}</Link>
        </article>) : <div className={styles.empty}><h2>No attention items</h2><p>Review calls to continue coaching.</p><Link className={styles.textLink} href="/calls">Open calls</Link></div>}
      </div>
    </section>
    <details className={styles.summary} data-dashboard-summary="true"><summary>Performance summary</summary><dl className={styles.statStrip} data-dashboard-stat-strip="true">{stats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd><p>{stat.hint}</p></div>)}</dl></details>
    {setupChecklist.length > 0 && <details className={styles.summary} data-dashboard-setup="true"><summary>Workspace setup</summary><ul className={styles.setupList}>{setupChecklist.map((step) => <li key={step.label}>{step.done ? <span>{step.label} · Complete</span> : <Link className={styles.textLink} href={step.href}>{step.label}</Link>}</li>)}</ul></details>}
    {canBrand && canManageWorkspace && <Link className={styles.textLink} data-dashboard-brand-shortcut="true" href="/settings/branding">Brand &amp; appearance</Link>}
  </div>;
}

function buildTodayQueueItems({
  executiveDashboard,
  isExecutive,
  isManager,
  managerDashboard,
  repDashboard,
  setupStatus,
}: {
  badges: Badge[];
  executiveDashboard: ExecutiveDashboard | null;
  isExecutive: boolean;
  isManager: boolean;
  managerDashboard: ManagerDashboard | null;
  repDashboard: RepDashboard | null;
  setupStatus: SetupStatusResult;
}): TodayQueueItem[] {
  const items: TodayQueueItem[] = [];

  if (isManager) {
    for (const rep of (managerDashboard?.reps ?? []).filter((member) => member.needsCoaching).slice(0, 5)) {
      items.push({
        actionLabel: "Open profile",
        description: `${formatRepCardName(rep)} is flagged for coaching. Review recent calls before assigning training.`,
        href: `/team/${rep.id}`,
        icon: rep.compositeScore != null && rep.compositeScore < 60 ? "priority_high" : "warning",
        id: `rep-${rep.id}`,
        label: formatRepCardName(rep),
        signal: rep.compositeScore != null ? `${rep.compositeScore} score` : `${rep.callCount} calls`,
        statusLabel: "Needs coaching",
        tone: rep.compositeScore != null && rep.compositeScore < 60 ? "danger" : "ember",
        typeLabel: "Rep coaching",
      });
    }

    if ((managerDashboard?.coachingFlagsCount ?? 0) > items.length) {
      items.push({
        actionLabel: "Open team",
        description: "Additional coaching flags are present across the team roster.",
        href: "/team",
        icon: "flag",
        id: "team-coaching-flags",
        label: "Review remaining coaching flags",
        signal: `${managerDashboard?.coachingFlagsCount ?? 0} flags`,
        statusLabel: "Attention",
        tone: "ember",
        typeLabel: "Team coaching",
      });
    }

    if ((managerDashboard?.totalCallsThisMonth ?? 0) === 0) {
      items.push({
        actionLabel: "Upload call",
        description: "No calls have been scored this month. Upload a recording to restart the review loop.",
        href: "/upload",
        icon: "cloud_upload",
        id: "no-calls-this-month",
        label: "No calls scored this month",
        signal: "0 calls",
        statusLabel: "Setup",
        tone: "gold",
        typeLabel: "Calls",
      });
    }

    if (setupStatus && setupStatus.roleplayCount === 0) {
      items.push({
        actionLabel: "Open roleplay",
        description: "No completed roleplay sessions are recorded yet.",
        href: "/roleplay",
        icon: "psychology",
        id: "roleplay-not-started",
        label: "Roleplay has not started",
        signal: "0 sessions",
        statusLabel: "Optional",
        tone: "muted",
        typeLabel: "Practice",
      });
    }
  } else {
    for (const call of (repDashboard?.recentCalls ?? []).slice(0, 3)) {
      items.push({
        actionLabel: "Open call",
        description: `${call.callTopic ?? "Untitled call"} was reviewed ${formatTimestamp(call.createdAt)}.`,
        href: `/calls/${call.id}`,
        icon: call.status === "failed" ? "error" : "subject",
        id: `call-${call.id}`,
        label: call.callTopic ?? "Untitled call",
        signal: call.overallScore != null ? `${call.overallScore} score` : call.status,
        statusLabel: call.status,
        tone: call.status === "failed" ? "danger" : scoreMetricTone(call.overallScore),
        typeLabel: "Recent call",
      });
    }

    for (const focusArea of (repDashboard?.lowestCategories ?? []).slice(0, 2)) {
      items.push({
        actionLabel: "Open training",
        description: `${focusArea.category} is currently the clearest coaching focus from scored calls.`,
        href: "/training",
        icon: "target",
        id: `focus-${focusArea.category}`,
        label: `${focusArea.category} focus`,
        signal: `${focusArea.avgScore} avg`,
        statusLabel: "Practice",
        tone: scoreMetricTone(focusArea.avgScore),
        typeLabel: "Focus area",
      });
    }
  }

  if (isExecutive) {
    const completionRate = executiveDashboard?.trainingStats?.completionRate;
    if (typeof completionRate === "number" && completionRate < 80) {
      items.push({
        actionLabel: "Open training",
        description: "Training completion is below the target threshold.",
        href: "/training",
        icon: "school",
        id: "training-completion",
        label: "Training completion below target",
        signal: `${completionRate}% complete`,
        statusLabel: "Watch",
        tone: "gold",
        typeLabel: "Training",
      });
    }

    const weakSkill = executiveDashboard?.skillAverages.find(
      (skill) => typeof skill.avgScore === "number" && skill.avgScore < 70,
    );
    if (weakSkill) {
      items.push({
        actionLabel: "Open training",
        description: `${weakSkill.category} is the lowest org-level skill average in the current scoring context.`,
        href: "/training",
        icon: "insights",
        id: `skill-${weakSkill.category}`,
        label: `${weakSkill.category} needs review`,
        signal: `${weakSkill.avgScore} avg`,
        statusLabel: "Focus",
        tone: "ember",
        typeLabel: "Skill trend",
      });
    }
  }

  if (!items.length) {
    items.push({
      actionLabel: isManager ? "Open team" : "Open calls",
      description: isManager
        ? "No immediate coaching or setup issues are flagged. Use Team for deeper review."
        : "No urgent coaching items are flagged. Use Calls to review recent scored conversations.",
      href: isManager ? "/team" : "/calls",
      icon: "check_circle",
      id: "queue-clear",
      label: "No urgent items",
      signal: "Clear",
      statusLabel: "Stable",
      tone: "success",
      typeLabel: "Status",
    });
  }

  return items.slice(0, 7);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRepCardName(rep: ManagerDashboard["reps"][number]) {
  return [rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep";
}
