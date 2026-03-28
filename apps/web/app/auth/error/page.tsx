import Link from "next/link";
import { buttonVariants } from "@argos-v2/ui";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-50">
      <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.25em] text-rose-300">Auth Error</p>
        <h1 className="mt-3 text-4xl font-semibold">The sign-in callback did not complete.</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          This usually means the callback URL or Supabase auth configuration still needs
          to be wired for the current environment.
        </p>
        <div className="mt-6">
          <Link className={buttonVariants()} href="/login">
            Return to login
          </Link>
        </div>
      </div>
    </main>
  );
}
