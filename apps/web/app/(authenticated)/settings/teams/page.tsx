import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TeamsPanel } from "@/components/page-panel-loaders";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";

export default async function SettingsTeamsPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const snapshotResult = await getTeamAccessSnapshot(
    createTeamAccessRepository(),
    authUser.id,
  );
  const snapshot = snapshotResult.ok ? snapshotResult.data : null;

  return (
    <PageFrame
      description="Create teams, edit metadata, and manage manager and rep assignments."
      headerMode="hidden"
      eyebrow="Settings"
      title="Teams"
    >
      <TeamsPanel
        managers={snapshot?.managers ?? []}
        memberships={snapshot?.memberships ?? []}
        reps={snapshot?.reps ?? []}
        teams={snapshot?.teams ?? []}
      />
    </PageFrame>
  );
}
