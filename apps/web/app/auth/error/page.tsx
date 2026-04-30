import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main
      className="forge-shell flex min-h-screen items-center justify-center px-6 py-10 text-[var(--forge-text)]"
      data-auth-shell="forge"
      data-shell-theme="forge"
    >
      <div className="forge-surface max-w-xl rounded-[2rem] p-8">
        <p className="forge-page-eyebrow text-[var(--forge-danger)]">Auth Error</p>
        <h1 className="mt-3 font-[var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--forge-text)]">
          The sign-in callback did not complete.
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--forge-muted)]">
          This usually means the callback URL or Supabase auth configuration still needs
          to be wired for the current environment.
        </p>
        <div className="mt-6">
          <Link className="forge-button forge-button-primary forge-focus-ring px-4 py-2.5 text-sm" href="/login">
            Return to login
          </Link>
        </div>
      </div>
    </main>
  );
}
