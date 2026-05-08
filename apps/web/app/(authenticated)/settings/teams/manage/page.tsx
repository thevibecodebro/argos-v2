import { TeamsPanel } from "@/components/panel-loaders/teams-panel-loader";
import { SettingsOperationalLayout } from "../../settings-operational-layout";
import { loadAdminTeamsSettings } from "../teams-page-data";

export default async function SettingsTeamsManagePage() {
  const snapshot = await loadAdminTeamsSettings();

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/teams", icon: "arrow_back", label: "Overview", variant: "secondary" }]}
      description="Create teams, edit metadata, and manage manager and rep assignments."
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
