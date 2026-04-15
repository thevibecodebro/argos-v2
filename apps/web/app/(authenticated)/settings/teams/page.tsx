import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { TeamsPanel } from "@/components/settings/teams-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsTeamsPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
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
