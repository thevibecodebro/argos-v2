import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  getCurrentUserProfile,
  getManagerDashboard,
  getRepBadges,
  getRepDashboard,
} from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export default async function RepProfilePage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = await params;
  const authUser = await getAuthenticatedSupabaseUser();
  const repository = createDashboardRepository();
  const profile = authUser
    ? await getCurrentUserProfile(repository, authUser.id)
    : null;

  if (profile?.role === "rep") {
    redirect("/dashboard");
  }

  const [managerDashboard, repDashboard, badges] = authUser
    ? await Promise.all([
        getManagerDashboard(repository, authUser.id),
        getRepDashboard(repository, authUser.id, repId),
        getRepBadges(repository, authUser.id, repId),
      ])
    : [null, null, null];

  const rep = managerDashboard?.reps.find((member) => member.id === repId);

  if (!rep || !repDashboard) {
    notFound();
  }

  return (
    <PageFrame
      actions={[
        { href: "/team", label: "Back to team" },
        { href: "/calls", label: "Open calls" },
      ]}
      description="Review score trends, focus categories, badges, and recent calls for the selected team member."
      eyebrow="Coaching"
      title="Rep Profile"
    >
      <section className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        <article className="rounded-xl border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.22)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Team Member</p>
          <h3 className="mt-3 text-3xl font-semibold text-[#ecedf6]">
            {[rep.firstName, rep.lastName].filter(Boolean).join(" ") || "Unknown rep"}
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SnapshotStat label="Average score" value={rep.compositeScore ?? "—"} />
            <SnapshotStat label="Calls reviewed" value={rep.callCount} />
            <SnapshotStat
              label="Week trend"
              tone={
                rep.weekOverWeekDelta === null
                  ? "slate"
                  : rep.weekOverWeekDelta < 0
                    ? "red"
                    : rep.weekOverWeekDelta > 0
                      ? "emerald"
                      : "slate"
              }
              value={rep.weekOverWeekDelta === null ? "—" : formatDelta(rep.weekOverWeekDelta)}
            />
            <SnapshotStat label="30-day average" value={repDashboard.monthlyAvgScore ?? "—"} />
          </div>
          {rep.needsCoaching ? (
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              This rep is currently flagged for coaching based on a negative week-over-week trend.
            </div>
          ) : null}
        </article>

        <article className="rounded-xl border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.22)]">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#74b1ff]">Focus Areas</p>
          {repDashboard.lowestCategories.length ? (
            <div className="mt-5 space-y-3">
              {repDashboard.lowestCategories.map((category) => (
                <div className="flex items-center gap-3" key={category.category}>
                  <span className="w-40 shrink-0 text-sm text-[#a9abb3]">{category.category}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#22262f]">
                    <div
                      className={`h-full rounded-full ${barColor(category.avgScore)}`}
                      style={{ width: `${Math.max(0, Math.min(category.avgScore, 100))}%` }}
                    />
                  </div>
                  <span className={`w-10 text-right text-sm font-semibold ${scoreColor(category.avgScore)}`}>
                    {category.avgScore}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#a9abb3]">No focus categories yet for this rep.</p>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <article className="rounded-xl border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.22)]">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Recent Calls</p>
            <Link className="text-sm font-medium text-[#74b1ff] transition hover:text-[#54a3ff]" href="/calls">
              Open call library
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {repDashboard.recentCalls.length ? (
              repDashboard.recentCalls.map((call) => (
                <Link
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4 transition hover:border-[#74b1ff]/30 hover:bg-[#74b1ff]/5"
                  href={`/calls/${call.id}`}
                  key={call.id}
                >
                  <div>
                    <p className="text-sm font-medium text-[#ecedf6]">{call.callTopic ?? "Untitled call"}</p>
                    <p className="mt-1 text-xs text-[#a9abb3]">{formatTimestamp(call.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${scoreColor(call.overallScore)}`}>{call.overallScore ?? "—"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#a9abb3]">{call.status}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[#a9abb3]">No recent calls for this rep yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.22)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Badges & Milestones</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(badges?.badges ?? []).map((badge) => (
              <div
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
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageFrame>
  );
}

function SnapshotStat({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  tone?: "blue" | "emerald" | "red" | "slate";
}) {
  return (
    <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#a9abb3]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass(tone)}`}>{value}</p>
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

function toneClass(tone: "blue" | "emerald" | "red" | "slate") {
  if (tone === "emerald") return "text-emerald-400";
  if (tone === "red") return "text-red-400";
  if (tone === "slate") return "text-[#ecedf6]";
  return "text-[#74b1ff]";
}

function barColor(value: number) {
  if (value >= 85) return "bg-emerald-400";
  if (value >= 70) return "bg-[#74b1ff]";
  if (value >= 60) return "bg-amber-400";
  return "bg-red-400";
}
