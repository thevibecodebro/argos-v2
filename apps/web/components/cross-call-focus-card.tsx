import Link from "next/link";
import type { CrossCallFocusRecommendation } from "@/lib/dashboard/cross-call-focus";

export function CrossCallFocusCard({
  recommendation,
  canPractice,
}: {
  recommendation: CrossCallFocusRecommendation;
  canPractice: boolean;
}) {
  const practiceHref = recommendation.practiceCallId
    ? `/calls/${recommendation.practiceCallId}?focus=${encodeURIComponent(recommendation.categorySlug)}`
    : null;
  const reviewHref = recommendation.sourceCalls[0]
    ? `/calls/${recommendation.sourceCalls[0].id}`
    : "/calls";

  return (
    <section
      aria-labelledby="cross-call-focus-title"
      className="rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface)] p-4"
      data-cross-call-focus="true"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-[var(--forge-muted)]">
            Practice focus
          </p>
          <h2 id="cross-call-focus-title" className="mt-1 text-lg font-semibold text-[var(--forge-text)]">
            {recommendation.categoryName}
          </h2>
          <p className="mt-1 text-sm text-[var(--forge-muted)]">
            {recommendation.weakCallCount} of {recommendation.scoredCallCount} recent calls scored below 70 in this skill.
            {" "}Average: {recommendation.averageScore}.
          </p>
          <p className="mt-1 text-xs text-[var(--forge-muted)]">
            Review the source calls to confirm the rubric fits each conversation.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center rounded-lg border border-[var(--forge-gold)] bg-[var(--forge-gold)] px-3 py-2 text-sm font-semibold text-[var(--forge-on-accent)] transition-opacity hover:opacity-90"
          href={canPractice && practiceHref ? practiceHref : reviewHref}
        >
          {canPractice && practiceHref ? `Practice ${recommendation.categoryName}` : "Review source call"}
        </Link>
      </div>
      <div className="mt-4 border-t border-[var(--forge-border)] pt-3">
        <p className="text-xs font-semibold text-[var(--forge-muted)]">Source calls</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {recommendation.sourceCalls.map((call) => (
            <li key={call.id}>
              <Link
                className="inline-flex rounded-lg border border-[var(--forge-border)] px-3 py-1.5 text-xs text-[var(--forge-text)] hover:border-[var(--forge-gold)]"
                href={`/calls/${call.id}`}
              >
                {call.callTopic || "Untitled call"} · {call.score}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
