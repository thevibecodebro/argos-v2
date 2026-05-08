import { RubricsPanel } from "@/components/panel-loaders/rubrics-panel-loader";
import { SettingsOperationalLayout } from "../../settings-operational-layout";
import { loadAdminRubricSettings } from "../rubric-page-data";

export default async function SettingsRubricBuilderPage() {
  const { activeRubric, defaultTemplate, history } = await loadAdminRubricSettings();

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/rubric", icon: "arrow_back", label: "Overview", variant: "secondary" }]}
      description="Create, review, and publish the scoring rubric used across reviewed calls."
      route="rubrics"
      title="Rubric builder"
      variant="editor"
    >
      <RubricsPanel
        defaultTemplate={defaultTemplate}
        initialActiveRubric={activeRubric}
        initialHistory={history}
      />
    </SettingsOperationalLayout>
  );
}
