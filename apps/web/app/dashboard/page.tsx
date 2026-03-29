import Link from "next/link";
import { buttonVariants } from "@argos-v2/ui";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getDashboardSummary } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  let summary = null;
  let setupError: string | null = null;

  if (authUser) {
    try {
      summary = await getDashboardSummary(createDashboardRepository(), authUser.id);
    } catch (error) {
      setupError = error instanceof Error ? error.message : "Unknown dashboard error";
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Protected shell</p>
          <h1 className="mt-3 text-4xl font-semibold">
            {summary ? `Welcome back, ${summary.user.fullName}` : "Dashboard foundation"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            This is the first database-backed feature port. The page resolves the
            authenticated Supabase user, joins them to the Argos app user record, and
            renders a real dashboard summary from the `calls` table.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-sky-300">30-Day Average</p>
            <h2 className="mt-3 text-2xl font-semibold">
              {summary?.metrics.rolling30DayAverageScore ?? "No scored calls yet"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {summary
                ? `${summary.metrics.callsReviewed30Days} scored call(s) included in the rolling 30-day window.`
                : "Connect the database and provision a user record to unlock the real dashboard summary."}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Provisioning</p>
            <h2 className="mt-3 text-2xl font-semibold">
              {summary?.user.org?.name ?? setupError ?? "Waiting on Supabase project wiring"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {summary
                ? `Signed in as ${summary.user.email} with role ${summary.user.role ?? "unassigned"}.`
                : "The repo-side config is in place, but an actual Supabase project and DATABASE_URL still need to be connected."}
            </p>
          </article>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Recent Calls</p>
              <h2 className="mt-3 text-2xl font-semibold">Latest coaching records</h2>
            </div>
            <Link className={buttonVariants({ variant: "secondary" })} href="/api/dashboard/summary">
              JSON summary
            </Link>
          </div>

          {summary?.recentCalls.length ? (
            <div className="mt-6 grid gap-3">
              {summary.recentCalls.map((call) => (
                <article
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                  key={call.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {call.callTopic ?? "Untitled sales call"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {new Date(call.createdAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                        {call.status}
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {call.overallScore ?? "Pending"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm leading-7 text-slate-300">
              No calls are available yet. Once the database is connected and seeded, this
              section will render the rep's latest call records.
            </p>
          )}
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
