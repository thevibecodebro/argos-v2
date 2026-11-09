import { redirect } from "next/navigation";
import { TrainingTeamPageView } from "@/components/training/training-pages";
import { loadTrainingPageData } from "../training-page-data";

export default async function TrainingTeamPage() {
  const { canManage, canViewTeamProfiles, teamRows } = await loadTrainingPageData({ includeTeamProgress: true });
  if (!canManage) redirect("/training");
  return <TrainingTeamPageView teamRows={teamRows} canViewProfiles={canViewTeamProfiles} />;
}
