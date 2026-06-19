import Link from "next/link";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  ForgeChip,
  ForgeEmptyState as ForgeEmptyStatePrimitive,
  ForgeIcon,
  type ForgeTone,
} from "@/components/forge";
import { createAccessRepository } from "@/lib/access/create-repository";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  createEffectiveAccessRepository,
  createEffectiveDashboardRepository,
} from "@/lib/dashboard/effective-platform";
import {
  getExecutiveDashboard,
  getManagerDashboard,
  getRepBadges,
  getRepDashboard,
  getSetupStatus,
  type Badge,
  type ExecutiveDashboard,
  type ManagerDashboard,
  type RepDashboard,
} from "@/lib/dashboard/service";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";

export default async function DashboardPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;

  if (!authUser || !profile) {
    return (
      <AuthenticatedPageContainer>
        <OperationalWorkspace data-dashboard-route="dashboard">
          <OperationalToolbar
            description="This account is authenticated but is not provisioned inside the Argos app database yet."
            eyebrow="Provisioning"
            title="Dashboard unavailable"
          />
          <EmptyState
            description="Complete app provisioning first, then reload the dashboard to unlock the attention queue."
            title="User record missing"
          />
        </OperationalWorkspace>
      </AuthenticatedPageContainer>
    );
  }

  const isExecutive = profile.role === "executive";
  const isManager = isExecutive || profile.role === "manager" || profile.role === "admin";
  const isPlatformSessionProfile = profile.email?.startsWith("platform:") ?? false;
  const dashboardRepository = authUser && isPlatformSessionProfile
    ? createEffectiveDashboardRepository(repository, profile, authUser.id)
    : repository;
  const accessRepository = authUser && isPlatformSessionProfile
    ? createEffectiveAccessRepository(createAccessRepository(), profile, authUser.id)
    : undefined;

  const [repDashboard, badges, managerDashboard, executiveDashboard, setupStatus] =
    await Promise.all([
      getRepDashboard(dashboardRepository, authUser.id, undefined, undefined, accessRepository),
      getRepBadges(dashboardRepository, authUser.id, undefined, accessRepository),
      isManager
        ? getManagerDashboard(dashboardRepository, authUser.id, undefined, accessRepository)
        : Promise.resolve(null),
      isExecutive ? getExecutiveDashboard(dashboardRepository, authUser.id) : Promise.resolve(null),
      isManager ? getSetupStatus(dashboardRepository, authUser.id) : Promise.resolve(null),
    ]);
  const roleLabel = isExecutive ? "Executive view" : isManager ? "Manager view" : "Rep view";

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-dashboard-route="dashboard">
        <OperationalToolbar
          actions={
            isManager
              ? [
                  { href: "/team", icon: "group", label: "Open team", variant: "secondary" },
                  { href: "/upload", icon: "cloud_upload", label: "Upload call", variant: "primary" },
                ]
              : [
                  { href: "/calls", icon: "subject", label: "Open calls", variant: "secondary" },
                  { href: "/training", icon: "school", label: "Open training", variant: "primary" },
              ]
          }
          description="Start with the items that need attention, then move into the right workspace."
          eyebrow="Work queue"
          status={{ icon: "dashboard", label: roleLabel, tone: "muted" }}
          title="Dashboard"
        />

        {isExecutive ? (
          <TodayDashboardView
            badges={badges?.badges ?? []}
            executiveDashboard={executiveDashboard}
            isExecutive
            isManager={isManager}
            managerDashboard={managerDashboard}
            repDashboard={repDashboard}
            setupStatus={setupStatus}
          />
        ) : isManager ? (
          <TodayDashboardView
            badges={badges?.badges ?? []}
            executiveDashboard={executiveDashboard}
            isExecutive={false}
            isManager={isManager}
            managerDashboard={managerDashboard}
            repDashboard={repDashboard}
            setupStatus={setupStatus}
          />
        ) : (
          <TodayDashboardView
            badges={badges?.badges ?? []}
            executiveDashboard={executiveDashboard}
            isExecutive={false}
            isManager={false}
            managerDashboard={managerDashboard}
            repDashboard={repDashboard}
            setupStatus={setupStatus}
          />
        )}
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function scoreMetricTone(value: number | null | undefined): ForgeTone {
  if (typeof value !== "number") return "muted";
  if (value >= 85) return "success";
  if (value >= 70) return "gold";
  if (value >= 60) return "ember";
  return "danger";
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

function TodayDashboardView({
  badges,
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
}) {
  const queueItems = buildTodayQueueItems({
    badges,
    executiveDashboard,
    isExecutive,
    isManager,
    managerDashboard,
    repDashboard,
    setupStatus,
  });
  const selected = queueItems[0] ?? null;

  return (
    <section
      className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
      data-dashboard-today-queue="true"
    >
      <div
        className="min-w-0 overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[var(--forge-table-bg)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--forge-text)_4%,transparent)]"
        data-dashboard-queue-table="true"
        data-forge-table="true"
      >
        <div className="border-b border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.4%,transparent)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
                Needs attention
              </h2>
            </div>
            <ForgeChip tone={queueItems.length ? "gold" : "muted"}>
              {queueItems.length} {queueItems.length === 1 ? "item" : "items"}
            </ForgeChip>
          </div>
        </div>

        {queueItems.length ? (
          <>
            <div className="grid gap-2 p-3 md:hidden">
              {queueItems.map((item) => (
                <Link
                  className="rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] p-4 transition hover:border-[color-mix(in_srgb,var(--forge-gold)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--forge-gold)_5.5%,transparent)]"
                  href={item.href}
                  key={`${item.id}-mobile`}
                >
                  <div className="flex items-start gap-3">
                    <QueueIcon item={item} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs text-[var(--forge-muted)]">
                            {item.description}
                          </p>
                        </div>
                        <ForgeChip tone={item.tone}>{item.statusLabel}</ForgeChip>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--forge-muted)]">
                        <span>{item.signal}</span>
                        <span className="font-semibold text-[var(--forge-gold)]">
                          {item.actionLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.4%,transparent)] text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                    <th className="px-4 py-3" scope="col">Work item</th>
                    <th className="px-4 py-3" scope="col">Signal</th>
                    <th className="px-4 py-3" scope="col">Status</th>
                    <th className="px-4 py-3 text-right" scope="col">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border)]">
                  {queueItems.map((item, index) => (
                    <tr
                      className="transition hover:bg-[color-mix(in_srgb,var(--forge-gold)_4.5%,transparent)]"
                      data-dashboard-queue-row={index === 0 ? "selected" : "default"}
                      key={item.id}
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <QueueIcon item={item} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                              {item.label}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs text-[var(--forge-muted)]">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-[var(--forge-text)]">
                        {item.signal}
                      </td>
                      <td className="px-4 py-4">
                        <ForgeChip tone={item.tone}>{item.statusLabel}</ForgeChip>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          className="inline-flex items-center justify-end gap-1 text-sm font-semibold text-[var(--forge-gold)] transition hover:text-[var(--forge-text)]"
                          href={item.href}
                        >
                          {item.actionLabel}
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
          <div className="p-4">
            <EmptyState
              description="Your highest-priority call, coaching, training, and setup items will appear here."
              title="No attention items"
            />
          </div>
        )}
      </div>

      <OperationalPreviewDrawer
        actions={
          selected
            ? [{ href: selected.href, icon: selected.icon, label: selected.actionLabel, variant: "primary" }]
            : [{ href: isManager ? "/team" : "/calls", icon: isManager ? "group" : "subject", label: isManager ? "Open team" : "Open calls", variant: "secondary" }]
        }
        description={
          selected?.description ??
          "This drawer previews the selected attention item and keeps the attention queue focused on the next action."
        }
        eyebrow="Selected item"
        title={selected?.label ?? "Queue clear"}
      >
        <div className="grid gap-2 text-sm">
          <SummaryRow label="Type" value={selected?.typeLabel ?? "None"} />
          <SummaryRow label="Signal" value={selected?.signal ?? "--"} />
          <SummaryRow label="Status" value={selected?.statusLabel ?? "Clear"} />
          <SummaryRow label="Earned badges" value={badges.filter((badge) => badge.earned).length} />
        </div>
      </OperationalPreviewDrawer>
    </section>
  );
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

function QueueIcon({ item }: { item: TodayQueueItem }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${queueIconToneClass(item.tone)}`}
    >
      <ForgeIcon name={item.icon} size={17} />
    </span>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-[var(--forge-muted)]">{label}</span>
      <span className="text-right font-semibold text-[var(--forge-text)]">{value}</span>
    </div>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <ForgeEmptyStatePrimitive description={description} title={title} />
  );
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

function queueIconToneClass(tone: ForgeTone) {
  if (tone === "success") {
    return "border-[color-mix(in_srgb,var(--forge-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-success)_8%,transparent)] text-[var(--forge-success)]";
  }
  if (tone === "danger") {
    return "border-[color-mix(in_srgb,var(--forge-danger)_26%,transparent)] bg-[color-mix(in_srgb,var(--forge-danger)_8%,transparent)] text-[var(--forge-danger)]";
  }
  if (tone === "ember") {
    return "border-[color-mix(in_srgb,var(--forge-ember)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-ember)_7%,transparent)] text-[var(--forge-ember)]";
  }
  if (tone === "cyan") {
    return "border-[color-mix(in_srgb,var(--forge-cyan)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-cyan)_7%,transparent)] text-[var(--forge-cyan)]";
  }
  if (tone === "gold") {
    return "border-[color-mix(in_srgb,var(--forge-gold)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-gold)_8%,transparent)] text-[var(--forge-gold)]";
  }
  return "border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] text-[var(--forge-muted)]";
}
