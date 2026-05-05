import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalMetricStrip,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { TrainingPanel } from "@/components/page-panel-loaders";
import { loadTrainingPageData } from "./training-page-data";

export default async function TrainingPage() {
  const {
    aiStatus,
    assignedCount,
    canManage,
    completedCount,
    modules,
    rubricCategories,
  } = await loadTrainingPageData();
  const actions = canManage
    ? [
        { href: "/training/team", icon: "groups", label: "Team progress", variant: "secondary" as const },
        { href: "/training/builder", icon: "edit_note", label: "Builder", variant: "secondary" as const },
      ]
    : [{ href: "/highlights", icon: "auto_awesome", label: "Open highlights", variant: "secondary" as const }];

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-training-route="operational-workspace">
        <OperationalToolbar
          actions={actions}
          description="Review assigned modules and complete the next lesson without manager tools crowding the page."
          eyebrow="Coach"
          status={{
            icon: "school",
            label: "My training",
            tone: "muted",
          }}
          title="Training"
        />

        <OperationalMetricStrip
          metrics={[
            {
              icon: "assignment",
              label: "Assigned",
              tone: assignedCount > 0 ? "gold" : "muted",
              value: assignedCount,
            },
            {
              icon: "task_alt",
              label: "Completed",
              tone: completedCount > 0 ? "success" : "muted",
              value: completedCount,
            },
            {
              icon: "library_books",
              label: "Modules",
              tone: modules.length > 0 ? "cyan" : "muted",
              value: modules.length,
            },
            {
              icon: aiStatus.available ? "auto_awesome" : "auto_awesome_off",
              label: "AI drafting",
              tone: aiStatus.available ? "success" : "muted",
              value: aiStatus.available ? "Ready" : "Off",
            },
          ]}
        />

        <section
          className="min-w-0"
          data-training-workspace="module-progress"
        >
          <TrainingPanel
            aiAvailable={aiStatus.available}
            canManage={false}
            initialModules={modules}
            initialTeamProgress={{ modules: [], repProgress: [] }}
            initialTeamRows={[]}
            rubricCategories={rubricCategories}
          />
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}
