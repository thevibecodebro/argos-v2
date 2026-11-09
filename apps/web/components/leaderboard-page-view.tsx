import Link from "next/link";
import type { ReactNode } from "react";
import { ForgeChip, ForgeEmptyState, ForgeIcon } from "@/components/forge";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import type { DashboardLeaderboard } from "@/lib/dashboard/service";

const pageActionClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface)] px-4 text-sm font-medium text-[var(--forge-text)] hover:bg-[var(--forge-surface-2)]";

export function LeaderboardPageView({ leaderboard, canViewProfiles = true }: { leaderboard: DashboardLeaderboard | null; canViewProfiles?: boolean }) {
  const qualityRows = leaderboard?.topQuality ?? [];
  const volumeRows = leaderboard?.topVolume ?? [];
  const improvementRows = leaderboard?.mostImproved ?? [];
  const rows = buildLeaderboardRows(qualityRows, volumeRows, improvementRows);

  return (
    <AuthenticatedPageContainer>
      <div className="min-w-0 space-y-6" data-operational-workspace="true" data-leaderboard-route="rank-table">
        <WorkspacePageHeader
          title="Leaderboard"
          description="Compare team scores, calls, and improvement."
          actions={canViewProfiles ? <Link className={pageActionClass} href="/team">Team</Link> : undefined}
        />

        <section className="min-w-0">
          <div
            className="min-w-0 overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[var(--forge-table-bg)]"
            data-forge-table="true"
          >
            <p className="border-b border-[var(--forge-border)] px-4 py-3 text-xs text-[var(--forge-muted)]">{rows.length} ranked reps</p>
            {rows.length ? (
              <>
              <div className="divide-y divide-[var(--forge-border)] md:hidden" data-leaderboard-mobile-list="true">
                {rows.map((entry) => (
                  <RankRow className="block min-w-0 space-y-3 p-4 hover:bg-[var(--forge-surface-2)]" href={canViewProfiles ? `/team/${entry.userId}` : undefined} key={entry.userId}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 break-words text-sm font-semibold text-[var(--forge-text)]"><span className="forge-tabular-nums mr-2 text-[var(--forge-muted)]">#{entry.rank}</span>{entry.name}</span>
                      {canViewProfiles ? <ForgeIcon name="chevron_right" size={18} /> : null}
                    </div>
                    <dl className="grid grid-cols-3 gap-3 text-xs">
                      <div><dt className="text-[var(--forge-muted)]">Score</dt><dd className={`forge-tabular-nums mt-1 text-sm font-semibold ${scoreColor(entry.score)}`}>{entry.score ?? "—"}</dd></div>
                      <div><dt className="text-[var(--forge-muted)]">Calls</dt><dd className="forge-tabular-nums mt-1 text-sm text-[var(--forge-text)]">{entry.calls ?? "—"}</dd></div>
                      <div><dt className="text-[var(--forge-muted)]">Movement</dt><dd className="forge-tabular-nums mt-1 text-sm text-[var(--forge-text)]">{formatMovement(entry.improvement)}</dd></div>
                    </dl>
                    {entry.score != null && entry.score < 70 ? <ForgeChip tone="ember">Needs review</ForgeChip> : null}
                  </RankRow>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.4%,transparent)] text-left text-xs font-medium text-[var(--forge-muted)]">
                      <th className="px-4 py-3" scope="col">Rank</th>
                      <th className="px-4 py-3" scope="col">Rep</th>
                      <th className="px-4 py-3" scope="col">Score</th>
                      <th className="px-4 py-3" scope="col">Calls</th>
                      <th className="px-4 py-3" scope="col">Movement</th>
                      {canViewProfiles ? <th className="px-4 py-3 text-right" scope="col">Action</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border)]">
                    {rows.map((entry) => (
                      <tr
                        className="transition hover:bg-[color-mix(in_srgb,var(--forge-gold)_4.5%,transparent)]"
                        key={entry.userId}
                      >
                        <td className="forge-tabular-nums px-4 py-4 text-sm font-semibold text-[var(--forge-gold)]">
                          #{entry.rank}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] text-xs font-semibold text-[var(--forge-text)]">
                              {initials(entry.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--forge-text)]">{entry.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`forge-tabular-nums px-4 py-4 text-sm font-semibold ${scoreColor(entry.score)}`}>
                          {entry.score ?? "--"}
                        </td>
                        <td className="forge-tabular-nums px-4 py-4 text-sm text-[var(--forge-text)]">{entry.calls ?? "--"}</td>
                        <td className="forge-tabular-nums px-4 py-4 text-sm text-[var(--forge-text)]">
                          {formatMovement(entry.improvement)}
                        </td>
                        {canViewProfiles ? <td className="px-4 py-4 text-right">
                          <Link
                            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--forge-gold)] hover:underline"
                            href={`/team/${entry.userId}`}
                          >
                            Review
                            <ForgeIcon name="arrow_forward" size={15} />
                          </Link>
                        </td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
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

        </section>
      </div>
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

function formatMovement(value: number | null) {
  return value == null ? "—" : `${value > 0 ? "+" : ""}${value}`;
}

function RankRow({ children, className, href }: { children: ReactNode; className: string; href?: string }) {
  return href ? <Link className={className} href={href}>{children}</Link> : <div className={className}>{children}</div>;
}
