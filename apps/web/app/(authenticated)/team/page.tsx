import Link from "next/link";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getCurrentUserProfile, getManagerDashboard } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser
    ? await getCurrentUserProfile(repository, authUser.id)
    : null;

  if (profile?.role === "rep") {
    redirect("/dashboard");
  }

  const dashboard = authUser ? await getManagerDashboard(repository, authUser.id) : null;
  const reps = dashboard?.reps ?? [];

  return (
    <PageFrame
      actions={[{ href: "/leaderboard", label: "Open leaderboard" }]}
      description="Review team performance with week-over-week trend, call volume, and coaching flags."
      eyebrow="Team"
      title="Team"
    >
      <section className="overflow-hidden rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="grid grid-cols-[minmax(0,1.5fr),120px,140px,110px] gap-4 border-b border-[#45484f]/10 px-6 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
          <span>Rep</span>
          <span className="text-right">Avg Score</span>
          <span className="text-right">Week Trend</span>
          <span className="text-right">Calls</span>
        </div>
        {reps.length ? (
          reps.map((rep) => (
            <Link
              className="grid grid-cols-[minmax(0,1.5fr),120px,140px,110px] gap-4 border-b border-[#45484f]/10 px-6 py-4 transition last:border-b-0 hover:bg-[#74b1ff]/5"
              href={`/team/${rep.id}`}
              key={rep.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[#ecedf6]">
                  {[rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {rep.needsCoaching ? (
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">
                      Needs coaching
                    </span>
                  ) : (
                    <span className="text-xs text-[#a9abb3]">Stable this week</span>
                  )}
                </div>
              </div>
              <span className={`text-right text-lg font-semibold ${scoreColor(rep.compositeScore)}`}>
                {rep.compositeScore ?? "—"}
              </span>
              <span
                className={`text-right text-sm font-medium ${
                  rep.weekOverWeekDelta === null
                    ? "text-[#a9abb3]"
                    : rep.weekOverWeekDelta < 0
                      ? "text-red-400"
                      : rep.weekOverWeekDelta > 0
                        ? "text-emerald-400"
                        : "text-[#ecedf6]"
                }`}
              >
                {rep.weekOverWeekDelta === null ? "—" : formatDelta(rep.weekOverWeekDelta)}
              </span>
              <span className="text-right text-sm font-medium text-[#ecedf6]">{rep.callCount}</span>
            </Link>
          ))
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-lg font-medium text-[#ecedf6]">No team members found</p>
            <p className="mt-2 text-sm leading-7 text-[#a9abb3]">
              Share the org slug with reps or upload more calls to populate the team roster.
            </p>
          </div>
        )}
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

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}
