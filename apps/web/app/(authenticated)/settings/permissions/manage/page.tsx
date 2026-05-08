import { PermissionsPanel } from "@/components/panel-loaders/permissions-panel-loader";
import { SettingsOperationalLayout } from "../../settings-operational-layout";
import { loadAdminPermissionsSettings } from "../permissions-page-data";

export default async function SettingsPermissionsManagePage() {
  const { presets, reps, snapshot } = await loadAdminPermissionsSettings();

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/permissions", icon: "arrow_back", label: "Overview", variant: "secondary" }]}
      description="Apply presets, review manager boundaries, and assign primary managers."
      route="permissions"
      title="Manage access"
      variant="editor"
    >
      <PermissionsPanel
        grants={snapshot?.grants ?? []}
        managers={snapshot?.managers ?? []}
        memberships={snapshot?.memberships ?? []}
        presets={presets}
        reps={reps}
        teams={snapshot?.teams ?? []}
      />
    </SettingsOperationalLayout>
  );
}
