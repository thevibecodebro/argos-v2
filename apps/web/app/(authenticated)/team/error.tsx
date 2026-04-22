"use client";

import Link from "next/link";
import { useEffect } from "react";
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
      <section className="rounded-[2rem] border border-amber-500/20 bg-[#10131a] p-6 shadow-[0_24px_70px_rgba(3,8,20,0.34)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <span className="material-symbols-outlined">warning</span>
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[#ecedf6]">
          Team view could not be loaded
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a9abb3]">
          Something interrupted the team experience before the data finished loading. Try the page again
          or return to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-2.5 text-sm font-semibold text-[#002345] transition hover:brightness-110 active:scale-[0.98]"
            onClick={() => reset()}
            type="button"
          >
            Try again
          </button>
          <Link
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-[#ecedf6] transition hover:border-[#74b1ff]/25 hover:bg-[#74b1ff]/[0.08] active:scale-[0.98]"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}
