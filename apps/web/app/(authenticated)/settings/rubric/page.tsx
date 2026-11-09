import { RubricSettingsOverview } from "@/components/settings/settings-overview-pages";
import { SettingsOperationalLayout } from "../settings-operational-layout";
import { loadSettingsRailItems } from "../settings-navigation-data";
import { loadAdminRubricSettings } from "./rubric-page-data";

export default async function SettingsRubricPage() {
  const { activeRubric, defaultTemplate, history } = await loadAdminRubricSettings();
  return (
    <SettingsOperationalLayout
      railItems={await loadSettingsRailItems()}
      actions={[{ href: "/settings/rubric/builder", icon: "edit_note", label: "Open builder", variant: "primary" }]}
      description="Configure the scoring rubric used across reviewed calls."
      route="rubrics"
      title="Rubrics"
    >
      <RubricSettingsOverview activeRubric={activeRubric} history={history} defaultTemplate={defaultTemplate} />
    </SettingsOperationalLayout>
  );
}
