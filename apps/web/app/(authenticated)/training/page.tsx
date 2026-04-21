import { CALL_SCORING_CATEGORIES } from "@argos-v2/call-processing";
import { PageFrame } from "@/components/page-frame";
import { TrainingPanel } from "@/components/training-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { getActiveRubric } from "@/lib/rubrics/service";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { getTrainingAiStatus, getTrainingModules, getTrainingTeamProgress } from "@/lib/training/service";
import { createUsersRepository } from "@/lib/users/create-repository";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  const appUser = authUser
    ? await createUsersRepository().findCurrentUserByAuthId(authUser.id)
    : null;
  const [modulesResult, teamProgressResult, aiStatus, activeRubricResult] = authUser
    ? await Promise.all([
        getTrainingModules(createTrainingRepository(), authUser.id),
        getTrainingTeamProgress(createTrainingRepository(), authUser.id),
        Promise.resolve(getTrainingAiStatus()),
        appUser?.orgId
          ? getActiveRubric(createRubricsRepository(), appUser.orgId)
          : Promise.resolve({ ok: false as const, status: 404 as const, error: "Active rubric not found" }),
      ])
    : [null, null, { available: false, reason: null }, null];

  const rubricCategories = activeRubricResult?.ok
    ? activeRubricResult.data.categories.map((category) => ({
        slug: category.slug ?? category.name,
        name: category.name,
      }))
    : CALL_SCORING_CATEGORIES.map((category) => ({
        slug: category.slug,
        name: category.name,
      }));

  return (
    <PageFrame
      actions={[{ href: "/highlights", label: "Open highlights" }]}
      description="Launch modules, track progress, and coach reps from a live training workspace."
      eyebrow="Training"
      title="Training"
    >
      <TrainingPanel
        aiAvailable={aiStatus.available}
        canManage={modulesResult?.ok ? modulesResult.data.canManage : false}
        initialModules={modulesResult?.ok ? modulesResult.data.modules : []}
        initialTeamProgress={teamProgressResult?.ok ? teamProgressResult.data.progress : { modules: [], repProgress: [] }}
        initialTeamRows={teamProgressResult?.ok ? teamProgressResult.data.rows : []}
        rubricCategories={rubricCategories}
      />
    </PageFrame>
  );
}
