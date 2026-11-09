import { redirect } from "next/navigation";
import { OnboardingEntryView } from "@/components/onboarding-panel";
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
    <OnboardingEntryView
      accessMode={accessMode}
      note={note}
      userEmail={currentUser.email}
    />
  );
}
