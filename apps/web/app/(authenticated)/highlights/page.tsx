import Link from "next/link";
import { HighlightNote } from "@/components/highlight-note";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listHighlights } from "@/lib/calls/service";

export const dynamic = "force-dynamic";

export default async function HighlightsPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  const result = authUser
    ? await listHighlights(createCallsRepository(), authUser.id)
    : null;
  const highlights = result?.ok ? result.data.highlights : [];

  // Derive live stats
  const categoryCounts: Record<string, number> = {};
  for (const h of highlights) {
    const cat = h.category ?? "Highlight";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const topCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const withRecommendation = highlights.filter((h) => h.recommendation).length;
  const completeness =
    highlights.length > 0
      ? Math.round((withRecommendation / highlights.length) * 100)
      : null;

  return (
    <div className="flex-1 p-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Hero header */}
        <section className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-['Space_Grotesk'] text-4xl font-bold tracking-tighter text-[#ecedf6] md:text-5xl">
              Highlights
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#a9abb3]">
              Review key coaching moments and critical intelligence extracted
              from your recent call history.
            </p>
          </div>
          <Link
            className="flex items-center gap-2 rounded-lg border border-[#45484f]/30 bg-[#22262f] px-5 py-2.5 text-[#a9abb3] transition-all hover:border-[#74b1ff]/50 hover:text-[#74b1ff] active:scale-95"
            href="/calls"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-widest">
              Back to call library
            </span>
          </Link>
        </section>

        {/* Highlights feed */}
        <div className="space-y-6">
          {highlights.map((highlight, i) => {
            const isPrimary = i % 2 === 0;
            const borderColor = isPrimary ? "#74b1ff" : "#6dddff";
            const badgeCls = isPrimary
              ? "bg-[#74b1ff]/10 text-[#74b1ff]"
              : "bg-[#6dddff]/10 text-[#6dddff]";
            const hoverTitle = isPrimary
              ? "group-hover:text-[#74b1ff]"
              : "group-hover:text-[#6dddff]";
            const hoverBtn = isPrimary
              ? "hover:border-[#74b1ff]/50"
              : "hover:border-[#6dddff]/50";
            return (
              <article
                className="group flex flex-col items-start gap-6 rounded-xl border-l-4 p-6 transition-all hover:bg-[#1c2028] md:flex-row md:items-center"
                key={highlight.id}
                style={{
                  borderLeftColor: borderColor,
                  background: "rgba(34,38,47,0.4)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-0.5 font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-widest ${badgeCls}`}
                    >
                      {highlight.category ?? "Highlight"}
                      {highlight.severity ? ` • ${highlight.severity}` : ""}
                    </span>
                  </div>
                  <h3
                    className={`mb-2 font-['Space_Grotesk'] text-xl font-bold text-[#ecedf6] transition-colors ${hoverTitle}`}
                  >
                    {highlight.observation}
                  </h3>
                  {highlight.recommendation && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-[#a9abb3]">
                      {highlight.recommendation}
                    </p>
                  )}
                  {highlight.highlightNote ? <HighlightNote note={highlight.highlightNote} /> : null}
                </div>
                <div className="w-full shrink-0 md:w-auto">
                  <Link
                    className={`group/btn flex w-full items-center justify-center gap-2 rounded-lg border border-[#45484f]/20 bg-[#22262f] px-6 py-3 font-bold text-[#ecedf6] transition-all md:w-auto ${hoverBtn}`}
                    href={`/calls/${highlight.callId}`}
                  >
                    <span className="font-['Space_Grotesk'] text-xs uppercase tracking-widest">
                      Open call
                    </span>
                    <span className="material-symbols-outlined text-sm transition-transform group-hover/btn:translate-x-1">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </article>
            );
          })}

          {/* End-of-list / empty state */}
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-[#45484f]/10 p-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#22262f]">
              <span className="material-symbols-outlined text-2xl text-[#74b1ff]">
                auto_awesome
              </span>
            </div>
            {highlights.length === 0 ? (
              <>
                <h4 className="mb-1 font-['Space_Grotesk'] text-lg font-bold">
                  No highlights yet
                </h4>
                <p className="max-w-xs text-sm text-[#a9abb3]">
                  Managers can star moments from a call detail page to build a
                  reusable coaching library here.
                </p>
              </>
            ) : (
              <>
                <h4 className="mb-1 font-['Space_Grotesk'] text-lg font-bold">
                  More highlights arriving soon
                </h4>
                <p className="max-w-xs text-sm text-[#a9abb3]">
                  Our intelligence engine is currently processing recent
                  recordings. Check back in a few minutes.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Bento cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Coaching Insights */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#45484f]/10 bg-[#10131a] p-6">
            <div className="relative z-10">
              <h4 className="mb-4 font-['Space_Grotesk'] text-xs font-black uppercase tracking-widest text-[#6dddff]">
                Weekly Coaching Insights
              </h4>
              {topCategory ? (
                <>
                  <p className="mb-4 font-['Space_Grotesk'] text-2xl font-bold">
                    Focus on &ldquo;{topCategory}&rdquo;
                  </p>
                  <p className="text-sm text-[#a9abb3]">
                    This is the most frequent pattern across your{" "}
                    {highlights.length} highlight
                    {highlights.length === 1 ? "" : "s"} — lean into coaching
                    around it in your next sessions.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-4 font-['Space_Grotesk'] text-2xl font-bold">
                    No data yet
                  </p>
                  <p className="text-sm text-[#a9abb3]">
                    Coaching insights will appear once highlights are captured
                    from your calls.
                  </p>
                </>
              )}
            </div>
            <div className="absolute -bottom-12 -right-12 opacity-5 transition-opacity group-hover:opacity-10">
              <span className="material-symbols-outlined text-[160px]">
                insights
              </span>
            </div>
          </div>

          {/* Intelligence Health */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#45484f]/10 bg-gradient-to-br from-[#10131a] to-[#161a21] p-6">
            <div>
              <h4 className="mb-4 font-['Space_Grotesk'] text-xs font-black uppercase tracking-widest text-[#74b1ff]">
                Intelligence Health
              </h4>
              <div className="mb-2 flex items-end gap-2">
                <span className="font-['Space_Grotesk'] text-4xl font-bold">
                  {completeness !== null ? `${completeness}%` : "—"}
                </span>
              </div>
              <p className="text-sm text-[#a9abb3]">
                {completeness !== null
                  ? `${withRecommendation} of ${highlights.length} highlights include actionable recommendations.`
                  : "No highlights to analyze yet. Start starring moments from call detail pages."}
              </p>
            </div>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-black">
              <div
                className="h-full rounded-full bg-[#74b1ff] shadow-[0_0_8px_rgba(116,177,255,0.5)] transition-all"
                style={{
                  width: completeness !== null ? `${completeness}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
