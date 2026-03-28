import Link from "next/link";
import { buttonVariants } from "@argos-v2/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Protected shell</p>
          <h1 className="mt-3 text-4xl font-semibold">Dashboard foundation</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            Middleware now gates this route through Supabase SSR auth. The full parity
            rebuild will hang call intelligence, coaching workflows, and training modules
            off this protected app surface.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Session</p>
            <h2 className="mt-3 text-2xl font-semibold">{user?.email ?? "No active session"}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Server components can now resolve the authenticated user through the shared
              Supabase server client.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">API</p>
            <h2 className="mt-3 text-2xl font-semibold">Health endpoint online</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The Next Route Handler surface is live at <code>/api/health</code>.
            </p>
          </article>
        </section>

        <div className="flex gap-3">
          <Link className={buttonVariants()} href="/">
            Back to landing page
          </Link>
          <Link className={buttonVariants({ variant: "secondary" })} href="/login">
            Auth screen
          </Link>
        </div>
      </div>
    </main>
  );
}
