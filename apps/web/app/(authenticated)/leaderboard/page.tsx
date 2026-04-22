import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getDashboardLeaderboard } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  const leaderboard = authUser
    ? await getDashboardLeaderboard(createDashboardRepository(), authUser.id)
    : null;

  const groups = [
    { key: "topQuality", title: "Top Quality", description: "Highest average scores this month" },
    { key: "topVolume", title: "Top Volume", description: "Most scored calls this month" },
    { key: "mostImproved", title: "Most Improved", description: "Largest month-over-month gains" },
  ] as const;

  return (
    <PageFrame
      headerMode="hidden"
      actions={[{ href: "/team", label: "Open team view" }]}
      description="Compare top-quality, top-volume, and most-improved slices across your team."
      eyebrow="Performance"
      title="Leaderboard"
    >
      <section className="grid gap-4 xl:grid-cols-3">
        {groups.map((group) => {
          const entries = leaderboard?.[group.key] ?? [];

          return (
            <article
              className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]"
              key={group.key}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">{group.title}</p>
              <p className="mt-2 text-sm text-[#a9abb3]">{group.description}</p>

              {entries.length ? (
                <div className="mt-6 space-y-3">
                  {entries.map((entry) => (
                    <Link
                      className="flex items-center justify-between gap-4 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4 transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/5"
                      href={`/team/${entry.userId}`}
                      key={entry.userId}
                    >
                      <div>
                        <p className="text-sm font-medium text-[#ecedf6]">
                          {entry.rank}. {[entry.firstName, entry.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                        </p>
                        <p className="mt-1 text-xs text-[#a9abb3]">Drill into team profile</p>
                      </div>
                      <span className={`text-lg font-semibold ${scoreColor(entry.value)}`}>{entry.value ?? "—"}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-[#45484f]/20 bg-[#161a21]/20 px-5 py-8 text-center">
                  <p className="text-lg font-medium text-[#ecedf6]">No data yet</p>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#a9abb3]">
                    Once this org has enough scored calls, this leaderboard slice will populate automatically.
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </PageFrame>
  );
}

function scoreColor(value: number | null | undefined) {
  if (typeof value !== "number") return "text-[#a9abb3]";
  if (value >= 85) return "text-emerald-400";
  if (value >= 70) return "text-[#74b1ff]";
  if (value >= 60) return "text-amber-400";
  return "text-red-400";
}
