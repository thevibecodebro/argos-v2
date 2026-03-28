import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath =
    resolvedSearchParams?.next && resolvedSearchParams.next.startsWith("/")
      ? resolvedSearchParams.next
      : "/dashboard";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#eef7ff_0%,_#ffffff_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">
              Access
            </p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
              Migrate the login layer without dragging Replit along.
            </h1>
          </div>
          <p className="max-w-xl text-lg leading-8 text-slate-600">
            Existing users will eventually claim migrated accounts by magic link first.
            This screen is the first working slice of that Supabase-based flow.
          </p>
          <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-5 text-sm text-sky-950">
            After sign-in, the callback route returns you to:
            <span className="ml-2 font-semibold">{nextPath}</span>
          </div>
        </section>

        <section className="flex items-center">
          <LoginForm nextPath={nextPath} />
        </section>
      </div>
    </main>
  );
}
