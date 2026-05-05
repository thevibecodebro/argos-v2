import { redirect } from "next/navigation";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { TrainingPanel } from "@/components/page-panel-loaders";
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
          description="Create modules, assign training, and use AI drafting without crowding the learner workspace."
          eyebrow="Coach"
          status={{
            icon: aiStatus.available ? "auto_awesome" : "auto_awesome_off",
            label: aiStatus.available ? "AI drafting ready" : "AI drafting off",
            tone: aiStatus.available ? "success" : "muted",
          }}
          title="Training builder"
        />

        <section className="min-w-0" data-training-workspace="builder">
          <TrainingPanel
            aiAvailable={aiStatus.available}
            canManage={canManage}
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
