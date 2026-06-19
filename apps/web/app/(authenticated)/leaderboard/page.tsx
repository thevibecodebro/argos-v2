import Link from "next/link";
import {
  ForgeChip,
  ForgeEmptyState,
  ForgeIcon,
} from "@/components/forge";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getDashboardLeaderboard } from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export default async function LeaderboardPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const repository = authUser
    ? await createEffectiveTenantRepository(createDashboardRepository(), authUser.id)
    : null;
  const leaderboard = authUser
    ? await getDashboardLeaderboard(repository ?? createDashboardRepository(), authUser.id)
    : null;

  const qualityRows = leaderboard?.topQuality ?? [];
  const volumeRows = leaderboard?.topVolume ?? [];
  const improvementRows = leaderboard?.mostImproved ?? [];
  const rows = buildLeaderboardRows(qualityRows, volumeRows, improvementRows);
  const selected = rows[0] ?? null;
  const sectionClassName = selected
    ? "grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
    : "grid min-w-0 gap-3";

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-leaderboard-route="rank-table">
        <OperationalToolbar
          actions={[{ href: "/team", label: "Open team view", variant: "secondary" }]}
          description="Compare rank, score quality, call volume, and improvement across your team."
          eyebrow="People"
          status={{ icon: "leaderboard", label: `${rows.length} ranked reps`, tone: "muted" }}
          title="Leaderboard"
        />

        <section className={sectionClassName}>
          <div
            className="min-w-0 overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[var(--forge-table-bg)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--forge-text)_4%,transparent)]"
            data-forge-table="true"
          >
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.4%,transparent)] text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                      <th className="px-4 py-3" scope="col">Rank</th>
                      <th className="px-4 py-3" scope="col">Rep</th>
                      <th className="px-4 py-3" scope="col">Score</th>
                      <th className="px-4 py-3" scope="col">Calls</th>
                      <th className="px-4 py-3" scope="col">Movement</th>
                      <th className="px-4 py-3" scope="col">Focus area</th>
                      <th className="px-4 py-3 text-right" scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border)]">
                    {rows.map((entry) => (
                      <tr
                        className="transition hover:bg-[color-mix(in_srgb,var(--forge-gold)_4.5%,transparent)]"
                        key={entry.userId}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--forge-gold)]">
                          #{entry.rank}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] text-xs font-semibold text-[var(--forge-text)]">
                              {initials(entry.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--forge-text)]">{entry.name}</p>
                              <p className="text-xs text-[var(--forge-muted)]">Team profile</p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-4 text-sm font-semibold ${scoreColor(entry.score)}`}>
                          {entry.score ?? "--"}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--forge-text)]">{entry.calls ?? "--"}</td>
                        <td className="px-4 py-4 text-sm text-[var(--forge-success)]">
                          {entry.improvement != null ? `+${entry.improvement}` : "--"}
                        </td>
                        <td className="px-4 py-4">
                          <ForgeChip tone={entry.score != null && entry.score < 70 ? "ember" : "muted"}>
                            {entry.score != null && entry.score < 70 ? "Needs review" : "Maintain quality"}
                          </ForgeChip>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--forge-gold)] hover:underline"
                            href={`/team/${entry.userId}`}
                          >
                            Review
                            <ForgeIcon name="arrow_forward" size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <ForgeEmptyState
                  description="Scored calls will populate rankings once reps have activity."
                  icon="leaderboard"
                  title="No leaderboard data"
                />
              </div>
            )}
          </div>

          {selected ? (
            <OperationalPreviewDrawer
              actions={[{ href: `/team/${selected.userId}`, label: "Open profile", variant: "primary" }]}
              data-selected-object-drawer="true"
              description="Rank is based on quality, call activity, and improvement signals for the selected period."
              eyebrow="Rep insight"
              title={selected.name}
            >
              <div className="grid gap-2 text-sm">
                <InsightRow label="Quality score" value={selected.score ?? "--"} />
                <InsightRow label="Call volume" value={selected.calls ?? "--"} />
                <InsightRow label="Improvement" value={selected.improvement != null ? `+${selected.improvement}` : "--"} />
                <InsightRow label="Coaching action" value={selected.score != null && selected.score < 70 ? "Review calls" : "Maintain pace"} />
              </div>
            </OperationalPreviewDrawer>
          ) : null}
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

type SourceEntry = {
  firstName: string | null;
  lastName: string | null;
  rank: number;
  userId: string;
  value: number | null;
};

function buildLeaderboardRows(
  qualityRows: SourceEntry[],
  volumeRows: SourceEntry[],
  improvementRows: SourceEntry[],
) {
  const records = new Map<string, {
    calls: number | null;
    improvement: number | null;
    name: string;
    rank: number;
    score: number | null;
    userId: string;
  }>();

  for (const row of qualityRows) {
    records.set(row.userId, {
      calls: null,
      improvement: null,
      name: formatName(row),
      rank: row.rank,
      score: row.value,
      userId: row.userId,
    });
  }

  for (const row of volumeRows) {
    const existing = records.get(row.userId);
    records.set(row.userId, {
      calls: row.value,
      improvement: existing?.improvement ?? null,
      name: existing?.name ?? formatName(row),
      rank: existing?.rank ?? row.rank,
      score: existing?.score ?? null,
      userId: row.userId,
    });
  }

  for (const row of improvementRows) {
    const existing = records.get(row.userId);
    records.set(row.userId, {
      calls: existing?.calls ?? null,
      improvement: row.value,
      name: existing?.name ?? formatName(row),
      rank: existing?.rank ?? row.rank,
      score: existing?.score ?? null,
      userId: row.userId,
    });
  }

  return [...records.values()].sort((a, b) => a.rank - b.rank);
}

function formatName(row: { firstName: string | null; lastName: string | null }) {
  return [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unknown rep";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function scoreColor(value: number | null | undefined) {
  if (typeof value !== "number") return "text-[var(--forge-muted)]";
  if (value >= 85) return "text-[var(--forge-success)]";
  if (value >= 70) return "text-[var(--forge-gold)]";
  if (value >= 60) return "text-[var(--forge-ember)]";
  return "text-[var(--forge-danger)]";
}

function InsightRow({
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
