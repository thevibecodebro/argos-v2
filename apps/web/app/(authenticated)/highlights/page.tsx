import Link from "next/link";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeSurface,
} from "@/components/forge";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listHighlights } from "@/lib/calls/service";

export default async function HighlightsPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
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
    <section className="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full">
      <div className="mx-auto w-full max-w-6xl">
        <section className="mb-8 flex justify-end">
          <ForgeButton href="/calls" icon="arrow_back" size="sm" variant="secondary">
            Back to call library
          </ForgeButton>
        </section>

        <div className="space-y-6">
          {highlights.map((highlight, i) => {
            const isPrimary = i % 2 === 0;
            const chipTone = isPrimary ? "gold" : "cyan";
            const hoverTitle = isPrimary
              ? "group-hover:text-[var(--forge-gold)]"
              : "group-hover:text-[var(--forge-cyan)]";
            const hoverBtn = isPrimary
              ? "hover:border-[var(--forge-gold)]/50"
              : "hover:border-[var(--forge-cyan)]/50";
            return (
              <ForgeSurface
                as="article"
                className="group flex flex-col items-start gap-6 p-6 md:flex-row md:items-center"
                data-highlight-tone={chipTone}
                key={highlight.id}
                variant="interactive"
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-3 flex items-center gap-3">
                    <ForgeChip tone={chipTone}>
                      {highlight.category ?? "Highlight"}
                      {highlight.severity ? ` • ${highlight.severity}` : ""}
                    </ForgeChip>
                  </div>
                  <h3
                    className={`mb-2 font-['Space_Grotesk'] text-xl font-bold text-[var(--forge-text)] transition-colors ${hoverTitle}`}
                  >
                    {highlight.observation}
                  </h3>
                  {highlight.recommendation && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-[var(--forge-muted)]">
                      {highlight.recommendation}
                    </p>
                  )}
                  {highlight.highlightNote && (
                    <p className="mt-2 text-sm italic text-[var(--forge-ember)]">
                      {highlight.highlightNote}
                    </p>
                  )}
                </div>
                <div className="w-full shrink-0 md:w-auto">
                  <Link
                    className={`group/btn flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-3)] px-6 py-3 font-bold text-[var(--forge-text)] transition-all md:w-auto ${hoverBtn}`}
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
              </ForgeSurface>
            );
          })}

          {/* End-of-list / empty state */}
          <ForgeEmptyState
            description={
              highlights.length === 0
                ? "Managers can star moments from a call detail page to build a reusable coaching library here."
                : "Recent recordings are still processing. Check back in a few minutes."
            }
            icon="auto_awesome"
            title={highlights.length === 0 ? "No highlights yet" : "More highlights arriving soon"}
          />
        </div>

        {/* Bento cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Coaching Insights */}
          <ForgeSurface as="section" className="group relative overflow-hidden p-6" variant="panel">
            <div className="relative z-10">
              <h4 className="mb-4 font-['Space_Grotesk'] text-xs font-black uppercase tracking-widest text-[var(--forge-cyan)]">
                Weekly Coaching Insights
              </h4>
              {topCategory ? (
                <>
                  <p className="mb-4 font-['Space_Grotesk'] text-2xl font-bold">
                    Focus on &ldquo;{topCategory}&rdquo;
                  </p>
                  <p className="text-sm text-[var(--forge-muted)]">
                    This is the most frequent pattern across your{" "}
                    {highlights.length} highlight
                    {highlights.length === 1 ? "" : "s"}; lean into coaching
                    around it in your next sessions.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-4 font-['Space_Grotesk'] text-2xl font-bold">
                    No data yet
                  </p>
                  <p className="text-sm text-[var(--forge-muted)]">
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
          </ForgeSurface>

          {/* Intelligence Health */}
          <ForgeSurface as="section" className="flex flex-col justify-between p-6" variant="panel">
            <div>
              <h4 className="mb-4 font-['Space_Grotesk'] text-xs font-black uppercase tracking-widest text-[var(--forge-gold)]">
                Intelligence Health
              </h4>
              <div className="mb-2 flex items-end gap-2">
                <span className="font-['Space_Grotesk'] text-4xl font-bold">
                  {completeness !== null ? `${completeness}%` : "—"}
                </span>
              </div>
              <p className="text-sm text-[var(--forge-muted)]">
                {completeness !== null
                  ? `${withRecommendation} of ${highlights.length} highlights include actionable recommendations.`
                  : "No highlights to analyze yet. Start starring moments from call detail pages."}
              </p>
            </div>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-black">
              <div
                className="h-full rounded-full bg-[var(--forge-gold)] shadow-[0_0_8px_rgba(241, 191, 123,0.5)] transition-all"
                style={{
                  width: completeness !== null ? `${completeness}%` : "0%",
                }}
              />
            </div>
          </ForgeSurface>
        </div>
      </div>
    </section>
  );
}
