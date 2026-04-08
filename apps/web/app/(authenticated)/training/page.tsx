import { PageFrame } from "@/components/page-frame";
import { TrainingPanel } from "@/components/training-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { getTrainingAiStatus, getTrainingModules, getTrainingTeamProgress } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  const [modulesResult, teamProgressResult, aiStatus] = authUser
    ? await Promise.all([
        getTrainingModules(createTrainingRepository(), authUser.id),
        getTrainingTeamProgress(createTrainingRepository(), authUser.id),
        Promise.resolve(getTrainingAiStatus()),
      ])
    : [null, null, { available: false, reason: null }];

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
      />
    </PageFrame>
  );
}
