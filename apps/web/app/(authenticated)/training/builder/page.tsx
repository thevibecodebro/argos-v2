import { redirect } from "next/navigation";
import { TrainingBuilderPageView } from "@/components/training/training-pages";
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

  return <TrainingBuilderPageView aiAvailable={aiStatus.available} initialModules={modules} initialTeamProgress={teamProgress} initialTeamRows={teamRows} rubricCategories={rubricCategories} />;
}
