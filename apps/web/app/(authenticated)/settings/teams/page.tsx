import { TeamsSettingsOverview } from "@/components/settings/settings-overview-pages";
import { SettingsOperationalLayout } from "../settings-operational-layout";
import { loadSettingsRailItems } from "../settings-navigation-data";
import { loadAdminTeamsSettings } from "./teams-page-data";

export default async function SettingsTeamsPage() {
  const snapshot = await loadAdminTeamsSettings();
  return (
    <SettingsOperationalLayout
      railItems={await loadSettingsRailItems()}
      actions={[{ href: "/settings/teams/manage", icon: "groups", label: "Manage teams", variant: "primary" }]}
      description="Configure teams and manager assignments."
      route="teams"
      title="Teams"
    >
      <TeamsSettingsOverview teams={snapshot?.teams ?? []} memberships={snapshot?.memberships ?? []} />
    </SettingsOperationalLayout>
  );
}
