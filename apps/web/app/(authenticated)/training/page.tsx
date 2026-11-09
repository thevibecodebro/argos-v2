import { TrainingLearnerPageView } from "@/components/training/training-pages";
import { loadTrainingPageData } from "./training-page-data";

export default async function TrainingPage() {
  const { canManage, canViewHighlights, canViewManagerPages, modules } = await loadTrainingPageData();
  return <TrainingLearnerPageView canManage={canManage} canViewHighlights={canViewHighlights} canViewManagerPages={canViewManagerPages} modules={modules} />;
}
