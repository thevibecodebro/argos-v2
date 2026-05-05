import { PermissionsPanel } from "@/components/page-panel-loaders";
import { SettingsOperationalLayout } from "../../settings-operational-layout";
import { loadAdminPermissionsSettings } from "../permissions-page-data";

export default async function SettingsPermissionsManagePage() {
  const { presets, reps, snapshot } = await loadAdminPermissionsSettings();

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/permissions", icon: "arrow_back", label: "Overview", variant: "secondary" }]}
      description="Apply presets, review manager boundaries, and assign primary managers."
      previewDescription="Preset grants and manager access boundaries."
      previewRows={[
        { label: "Presets", value: presets.length },
        { label: "Grants", value: snapshot?.grants.length ?? 0 },
        { label: "Managers", value: snapshot?.managers.length ?? 0 },
        { label: "Teams", value: snapshot?.teams.length ?? 0 },
      ]}
      previewTitle="Manage status"
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
