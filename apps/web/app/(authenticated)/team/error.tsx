"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ForgeIcon } from "@/components/forge";
import { PageFrame } from "@/components/page-frame";

export default function TeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageFrame
      description="Review team performance with week-over-week trend, call volume, and coaching flags."
      eyebrow="Team"
      title="Team"
      tone="warning"
    >
      <section className="rounded-[2rem] border border-[rgba(255,159,95,0.22)] bg-[var(--forge-surface)] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(255,159,95,0.26)] bg-[rgba(255,159,95,0.1)] text-[var(--forge-ember)]">
          <ForgeIcon name="warning" size={24} />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--forge-text)]">
          Team view could not be loaded
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--forge-muted)]">
          Something interrupted the team experience before the data finished loading. Try the page again
          or return to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-4 py-2.5 text-sm font-semibold text-[#170d07] transition hover:brightness-110 active:scale-[0.98]"
            onClick={() => reset()}
            type="button"
          >
            Try again
          </button>
          <Link
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-[var(--forge-text)] transition hover:border-[var(--forge-gold)]/25 hover:bg-[var(--forge-gold)]/[0.08] active:scale-[0.98]"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}
