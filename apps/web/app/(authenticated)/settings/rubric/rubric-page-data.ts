import { DEFAULT_CALL_SCORING_RUBRIC } from "@argos-v2/call-processing";
import { redirect } from "next/navigation";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { getActiveRubric, loadRubricHistory } from "@/lib/rubrics/service";
import type { RubricInput, RubricSummary, RubricWithCategories } from "@/lib/rubrics/types";

export type AdminRubricSettings = {
  activeRubric: RubricWithCategories | null;
  defaultTemplate: RubricInput;
  history: RubricSummary[];
};

export function buildDefaultTemplate(): RubricInput {
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

export async function loadAdminRubricSettings(): Promise<AdminRubricSettings> {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const userResult = await getCachedCurrentUserDetails(authUser.id);
  if (!userResult.ok) redirect("/settings");
  if (userResult.data.role !== "admin") redirect("/settings");

  const rubricsRepository = createRubricsRepository();
  const [activeResult, history] = await Promise.all([
    getActiveRubric(rubricsRepository, userResult.data.orgId ?? ""),
    loadRubricHistory(rubricsRepository, userResult.data.orgId ?? ""),
  ]);

  return {
    activeRubric: activeResult.ok ? activeResult.data : null,
    defaultTemplate: buildDefaultTemplate(),
    history,
  };
}
