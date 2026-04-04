import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
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

  return (
    <PageFrame
      actions={[{ href: "/calls", label: "Back to call library" }]}
      description="Highlighted coaching moments resolve from real call moment rows. Managers can star moments from call detail pages and review them here."
      eyebrow="Highlights"
      title="Highlights"
    >
      <section className="space-y-4 rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        {highlights.length ? (
          highlights.map((highlight) => (
            <article className="rounded-[1.3rem] border border-slate-800/70 bg-slate-950/25 px-5 py-5" key={highlight.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                    {highlight.category ?? "highlight"} · {highlight.severity ?? "note"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{highlight.observation}</p>
                </div>
                <Link
                  className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25"
                  href={`/calls/${highlight.callId}`}
                >
                  Open call
                </Link>
              </div>
              {highlight.recommendation ? (
                <p className="mt-3 text-sm leading-7 text-slate-400">{highlight.recommendation}</p>
              ) : null}
              {highlight.highlightNote ? (
                <p className="mt-3 text-sm italic text-amber-200">{highlight.highlightNote}</p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-4 py-10 text-center">
            <p className="text-lg font-medium text-slate-200">No highlights yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Managers can star moments from a call detail page to build a reusable coaching library here.
            </p>
          </div>
        )}
      </section>
    </PageFrame>
  );
}
