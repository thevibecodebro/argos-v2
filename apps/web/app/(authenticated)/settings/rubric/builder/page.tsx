import { RubricsPanel } from "@/components/page-panel-loaders";
import { SettingsOperationalLayout } from "../../settings-operational-layout";
import { loadAdminRubricSettings } from "../rubric-page-data";

export default async function SettingsRubricBuilderPage() {
  const { activeRubric, defaultTemplate, history } = await loadAdminRubricSettings();

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/rubric", icon: "arrow_back", label: "Overview", variant: "secondary" }]}
      description="Create, review, and publish the scoring rubric used across reviewed calls."
      previewDescription="Active rubric and scoring-system history."
      previewRows={[
        { label: "Active rubric", value: activeRubric?.name ?? "Default template" },
        { label: "Categories", value: activeRubric?.categories.length ?? defaultTemplate.categories.length },
        { label: "History", value: history.length },
        { label: "Status", tone: activeRubric ? "success" : "muted", value: activeRubric ? "Active" : "Default" },
      ]}
      previewTitle="Builder status"
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
