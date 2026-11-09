import { PermissionsSettingsOverview } from "@/components/settings/settings-overview-pages";
import { SettingsOperationalLayout } from "../settings-operational-layout";
import { loadSettingsRailItems } from "../settings-navigation-data";
import { loadAdminPermissionsSettings } from "./permissions-page-data";

export default async function SettingsPermissionsPage() {
  const { snapshot } = await loadAdminPermissionsSettings();
  return (
    <SettingsOperationalLayout
      railItems={await loadSettingsRailItems()}
      actions={[{ href: "/settings/permissions/manage", icon: "lock_open", label: "Manage access", variant: "primary" }]}
      description="Review role scopes and permission boundaries."
      route="permissions"
      title="Permissions"
    >
      <PermissionsSettingsOverview teams={snapshot?.teams ?? []} memberships={snapshot?.memberships ?? []} grants={snapshot?.grants ?? []} />
    </SettingsOperationalLayout>
  );
}
