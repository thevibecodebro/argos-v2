import { redirect } from "next/navigation";
import { LegacyAuthShell } from "@/components/legacy-shell";
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
      : "Create a new team or join your existing one to unlock the Argos workspace.";

  return (
    <LegacyAuthShell note={note}>
      <div className="text-center">
        <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[var(--forge-text)] sm:text-5xl">
          Welcome to Argos
        </h1>
        <p className="mt-4 text-lg leading-8 text-[var(--forge-muted)]">
          {accessMode === "invite-only"
            ? "Use your invitation to enter the workspace your admin created."
            : "Set up your organization to start coaching your sales team."}
        </p>
      </div>
      <div className="mt-10">
        <OnboardingPanel accessMode={accessMode} />
      </div>
    </LegacyAuthShell>
  );
}
