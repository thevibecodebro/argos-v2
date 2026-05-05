import { TeamsPanel } from "@/components/page-panel-loaders";
import { SettingsOperationalLayout } from "../../settings-operational-layout";
import { loadAdminTeamsSettings } from "../teams-page-data";

export default async function SettingsTeamsManagePage() {
  const snapshot = await loadAdminTeamsSettings();

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/teams", icon: "arrow_back", label: "Overview", variant: "secondary" }]}
      description="Create teams, edit metadata, and manage manager and rep assignments."
      previewDescription="Team structure and assignment coverage."
      previewRows={[
        { label: "Teams", value: snapshot?.teams.length ?? 0 },
        { label: "Managers", value: snapshot?.managers.length ?? 0 },
        { label: "Reps", value: snapshot?.reps.length ?? 0 },
        { label: "Memberships", value: snapshot?.memberships.length ?? 0 },
      ]}
      previewTitle="Manage status"
      route="teams"
      title="Manage teams"
      variant="editor"
    >
      <TeamsPanel
        managers={snapshot?.managers ?? []}
        memberships={snapshot?.memberships ?? []}
        reps={snapshot?.reps ?? []}
        teams={snapshot?.teams ?? []}
      />
    </SettingsOperationalLayout>
  );
}
