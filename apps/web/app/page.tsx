import Link from "next/link";
import { buttonVariants } from "@argos-v2/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-between gap-12 rounded-[2rem] border border-white/70 bg-white/70 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur md:p-12">
        <header className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-700">
              Argos V2
            </p>
            <h1 className="mt-3 max-w-2xl text-5xl font-semibold tracking-tight md:text-7xl">
              Sales coaching rebuilt on Next.js and Supabase.
            </h1>
          </div>

          <Link className={buttonVariants({ variant: "secondary" })} href="/login">
            Sign in
          </Link>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              This repo is the foundation for the full Argos replatform: App Router web,
              Supabase auth and storage, shared UI primitives, and a separate worker for
              media, AI scoring, and realtime roleplay.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link className={buttonVariants()} href="/dashboard">
                Open dashboard shell
              </Link>
              <Link className={buttonVariants({ variant: "ghost" })} href="/login">
                Try auth flow
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
              <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Phase 1</p>
              <h2 className="mt-3 text-2xl font-semibold">Foundation</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Typed environment loading, Supabase SSR auth, route protection, Tailwind
                v4, and workspace-ready shared packages.
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-700">Next</p>
              <h2 className="mt-3 text-2xl font-semibold">Feature parity build-out</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Call library, coaching workflows, integrations, and queue-backed worker
                pipelines land on this foundation.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
