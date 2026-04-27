import Link from "next/link";
import { ForgeEmptyState, ForgeWidget } from "@/components/forge";
import { PageFrame } from "@/components/page-frame";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getDashboardLeaderboard } from "@/lib/dashboard/service";

export default async function LeaderboardPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const leaderboard = authUser
    ? await getDashboardLeaderboard(createDashboardRepository(), authUser.id)
    : null;

  const groups = [
    { key: "topQuality", title: "Top Quality", description: "Highest average scores this month" },
    { key: "topVolume", title: "Top Volume", description: "Most scored calls this month" },
    { key: "mostImproved", title: "Most Improved", description: "Largest month-over-month gains" },
  ] as const;

  return (
    <section className="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full">
      <PageFrame
        actions={[{ href: "/team", label: "Open team view" }]}
        description="Compare rank, score quality, call volume, and improvement across your team."
        eyebrow="Performance"
        title="Leaderboard"
      >
        <section className="grid gap-4 xl:grid-cols-3">
          {groups.map((group) => {
            const entries = leaderboard?.[group.key] ?? [];

            return (
              <ForgeWidget
                eyebrow="Ranks"
                key={group.key}
                title={group.title}
              >
                <p className="text-sm leading-6 text-[var(--forge-muted)]">{group.description}</p>

                {entries.length ? (
                  <div className="mt-6 space-y-3">
                    {entries.map((entry) => (
                      <Link
                        className="flex items-center justify-between gap-4 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4 transition hover:border-[var(--forge-gold)]/30 hover:bg-[var(--forge-gold)]/5"
                        href={`/team/${entry.userId}`}
                        key={entry.userId}
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--forge-text)]">
                            {entry.rank}. {[entry.firstName, entry.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--forge-muted)]">Drill into team profile</p>
                        </div>
                        <span className={`text-lg font-semibold ${scoreColor(entry.value)}`}>{entry.value ?? "—"}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <ForgeEmptyState
                    className="mt-6"
                    description="Once this org has enough scored calls, this leaderboard slice will populate automatically."
                    icon="leaderboard"
                    title="No data yet"
                  />
                )}
              </ForgeWidget>
            );
          })}
        </section>
      </PageFrame>
    </section>
  );
}

function scoreColor(value: number | null | undefined) {
  if (typeof value !== "number") return "text-[var(--forge-muted)]";
  if (value >= 85) return "text-[var(--forge-success)]";
  if (value >= 70) return "text-[var(--forge-gold)]";
  if (value >= 60) return "text-[var(--forge-ember)]";
  return "text-[var(--forge-danger)]";
}
