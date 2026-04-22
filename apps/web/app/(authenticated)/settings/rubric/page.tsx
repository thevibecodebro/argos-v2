import { DEFAULT_CALL_SCORING_RUBRIC } from "@argos-v2/call-processing";
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { RubricsPanel } from "@/components/settings/rubrics-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import type { RubricInput } from "@/lib/rubrics/types";
import { getActiveRubric, loadRubricHistory } from "@/lib/rubrics/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

function buildDefaultTemplate(): RubricInput {
  return {
    name: DEFAULT_CALL_SCORING_RUBRIC.name,
    description: "Editable starter based on the default Revenue Scorecard.",
    categories: DEFAULT_CALL_SCORING_RUBRIC.categories.map((category, index) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      weight: category.weight,
      sortOrder: index,
      scoringCriteria: {
        excellent: category.scoringCriteria.excellent,
        proficient: category.scoringCriteria.proficient,
        developing: category.scoringCriteria.developing,
        lookFor: [...category.scoringCriteria.lookFor],
      },
    })),
  };
}

export default async function SettingsRubricPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const userResult = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!userResult.ok) redirect("/settings");
  if (userResult.data.role !== "admin") redirect("/settings");

  const rubricsRepository = createRubricsRepository();
  const [activeResult, history] = await Promise.all([
    getActiveRubric(rubricsRepository, userResult.data.orgId ?? ""),
    loadRubricHistory(rubricsRepository, userResult.data.orgId ?? ""),
  ]);

  const activeRubric = activeResult.ok ? activeResult.data : null;

  return (
    <PageFrame
      description="Create new immutable rubric versions, import draft sources, and publish only when the next version is ready."
      headerMode="hidden"
      eyebrow="Settings"
      title="Rubrics"
    >
      <RubricsPanel
        defaultTemplate={buildDefaultTemplate()}
        initialActiveRubric={activeRubric}
        initialHistory={history}
      />
    </PageFrame>
  );
}
