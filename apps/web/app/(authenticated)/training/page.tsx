import { CALL_SCORING_CATEGORIES } from "@argos-v2/call-processing";
import { PageFrame } from "@/components/page-frame";
import { TrainingPanel } from "@/components/page-panel-loaders";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { getActiveRubric } from "@/lib/rubrics/service";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { getTrainingAiStatus, getTrainingModules, getTrainingTeamProgress } from "@/lib/training/service";

export default async function TrainingPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const currentUserResult = authUser ? await getCachedCurrentUserDetails(authUser.id) : null;
  const orgId = currentUserResult?.ok ? currentUserResult.data.orgId : null;
  const [modulesResult, teamProgressResult, aiStatus, activeRubricResult] = authUser
    ? await Promise.all([
        getTrainingModules(createTrainingRepository(), authUser.id),
        getTrainingTeamProgress(createTrainingRepository(), authUser.id),
        Promise.resolve(getTrainingAiStatus()),
        orgId
          ? getActiveRubric(createRubricsRepository(), orgId)
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
    <section className="px-12 pb-12 pt-8 flex-1 max-w-7xl mx-auto w-full">
      <PageFrame
        headerMode="hidden"
        actions={[{ href: "/highlights", label: "Open highlights" }]}
        description="Review assigned modules, complete lessons, and guide practice from one training surface."
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
    </section>
  );
}
