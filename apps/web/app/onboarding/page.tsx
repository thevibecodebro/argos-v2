import { redirect } from "next/navigation";
import Link from "next/link";
import { OnboardingPanel } from "@/components/onboarding-panel";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { getOnboardingAccessModeForEmail } from "@/lib/onboarding/service";

export default async function OnboardingPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();

  if (!authUser) {
    redirect("/login?next=/onboarding");
  }

  const currentUser = await getCachedCurrentUserProfile(authUser.id);

  if (!currentUser) {
    redirect("/auth/error");
  }

  if (currentUser.org) {
    redirect("/dashboard");
  }

  const accessMode = getOnboardingAccessModeForEmail(currentUser.email);
  const note =
    accessMode === "invite-only"
      ? "Argos workspaces are opened through admin invitations."
      : "Create a new workspace, then invite your team to unlock the Argos workspace.";

  return (
    <main
      className="forge-shell min-h-dvh text-[var(--forge-text)] selection:bg-[rgba(241,191,123,0.24)] selection:text-[var(--forge-text)]"
      data-auth-shell="forge"
      data-shell-theme="forge"
      style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
    >
      <header className="flex min-h-14 items-center justify-between border-b border-[var(--forge-border)] bg-[rgba(16,9,7,0.92)] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            className="forge-focus-ring rounded-md font-[var(--font-display)] text-sm font-black uppercase text-[var(--forge-gold)]"
            href="/"
          >
            Argos
          </Link>
          <span className="hidden h-4 w-px bg-[var(--forge-border)] sm:block" />
          <span className="inline-flex min-h-8 items-center gap-2 rounded-md border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-2.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--forge-success)]" />
            Workspace access
          </span>
        </div>
        <form action="/auth/signout" method="post">
          <button
            className="forge-focus-ring rounded-md px-2 py-2 text-sm font-medium text-[var(--forge-muted)] transition hover:text-[var(--forge-text)]"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>

      <OnboardingPanel
        accessMode={accessMode}
        note={note}
        userEmail={currentUser.email}
      />
    </main>
  );
}
