import { redirect } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { TrainingCurriculumPanel } from "@/components/panel-loaders/training-curriculum-panel-loader";
import { loadTrainingPageData } from "../training-page-data";

export default async function TrainingBuilderPage() {
  const {
    aiStatus,
    canManage,
    modules,
    rubricCategories,
    teamProgress,
    teamRows,
  } = await loadTrainingPageData({ includeTeamProgress: true });

  if (!canManage) {
    redirect("/training");
  }

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-training-route="builder">
        <OperationalToolbar
          actions={[
            { href: "/training", icon: "school", label: "My training", variant: "secondary" },
            { href: "/training/team", icon: "groups", label: "Team progress", variant: "secondary" },
          ]}
          description="Create modules, assign training, and draft with AI."
          eyebrow="Coach"
          status={{
            icon: "library_books",
            label: `${modules.length} modules`,
            tone: modules.length > 0 ? "gold" : "muted",
          }}
          title="Curriculum"
        />

        <section className="min-w-0" data-training-workspace="builder">
          <TrainingCurriculumPanel
            aiAvailable={aiStatus.available}
            initialModules={modules}
            initialTeamProgress={teamProgress}
            initialTeamRows={teamRows}
            rubricCategories={rubricCategories}
          />
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}
