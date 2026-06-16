import { CALL_SCORING_CATEGORIES } from "@argos-v2/call-processing";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { getActiveRubric } from "@/lib/rubrics/service";
import { createTrainingRepository } from "@/lib/training/create-repository";
import {
  getTrainingAiStatus,
  getTrainingModules,
  getTrainingTeamProgress,
  type TrainingModuleSummary,
  type TrainingTeamProgress,
  type TrainingTeamProgressShell,
} from "@/lib/training/service";

const EMPTY_TEAM_PROGRESS: TrainingTeamProgressShell = {
  modules: [],
  repProgress: [],
};

export type TrainingPageData = {
  aiStatus: ReturnType<typeof getTrainingAiStatus>;
  assignedCount: number;
  averageCompletion: number;
  canManage: boolean;
  completedCount: number;
  modules: TrainingModuleSummary[];
  rubricCategories: Array<{ slug: string; name: string }>;
  teamProgress: TrainingTeamProgressShell;
  teamRows: TrainingTeamProgress[];
};

type LoadTrainingPageDataOptions = {
  includeTeamProgress?: boolean;
};

export async function loadTrainingPageData(
  options: LoadTrainingPageDataOptions = {},
): Promise<TrainingPageData> {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const currentUserProfile = authUser ? await getCachedCurrentUserProfile(authUser.id) : null;
  const orgId = currentUserProfile?.org?.id ?? null;
  const trainingRepository = authUser
    ? await createEffectiveTenantRepository(createTrainingRepository(), authUser.id)
    : null;
  const [modulesResult, aiStatus, activeRubricResult] = authUser
    ? await Promise.all([
        getTrainingModules(trainingRepository ?? createTrainingRepository(), authUser.id),
        Promise.resolve(getTrainingAiStatus()),
        orgId
          ? getActiveRubric(createRubricsRepository(), orgId)
          : Promise.resolve({ ok: false as const, status: 404 as const, error: "Active rubric not found" }),
      ])
    : [null, getTrainingAiStatus(), null];

  const rubricCategories = activeRubricResult?.ok
    ? activeRubricResult.data.categories.map((category) => ({
        slug: category.slug ?? category.name,
        name: category.name,
      }))
    : CALL_SCORING_CATEGORIES.map((category) => ({
      slug: category.slug,
      name: category.name,
    }));
  const modules = modulesResult?.ok ? modulesResult.data.modules : [];
  const canManage = modulesResult?.ok ? modulesResult.data.canManage : false;
  const teamProgressResult = authUser && canManage && options.includeTeamProgress
    ? await getTrainingTeamProgress(trainingRepository ?? createTrainingRepository(), authUser.id)
    : null;
  const teamRows = teamProgressResult?.ok ? teamProgressResult.data.rows : [];
  const assignedCount = modules.filter((module) => module.progress?.status === "assigned").length;
  const completedCount = modules.filter((module) => module.progress?.status === "passed").length;
  const averageCompletion = teamRows.length
    ? Math.round(teamRows.reduce((sum, row) => sum + row.completionRate, 0) / teamRows.length)
    : 0;

  return {
    aiStatus,
    assignedCount,
    averageCompletion,
    canManage,
    completedCount,
    modules,
    rubricCategories,
    teamProgress: teamProgressResult?.ok ? teamProgressResult.data.progress : EMPTY_TEAM_PROGRESS,
    teamRows,
  };
}
