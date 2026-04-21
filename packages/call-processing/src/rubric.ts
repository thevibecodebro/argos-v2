import {
  CALL_STAGE_REACHED_VALUES,
  type CallEvaluation,
  type CallScoringCategorySlug,
  type ScoringRubric,
  type ScoringRubricCategory,
} from "./types";

export type CallScoreField = keyof Pick<
  CallEvaluation,
  | "frameControlScore"
  | "rapportScore"
  | "discoveryScore"
  | "painExpansionScore"
  | "solutionScore"
  | "objectionScore"
  | "closingScore"
>;

type DefaultScoringCategoryDefinition = ScoringRubricCategory & {
  legacyScoreField: CallScoreField;
};

function createDefaultCategory(input: {
  description: string;
  excellent: string;
  legacyScoreField: CallScoreField;
  lookFor: string[];
  name: string;
  proficient: string;
  slug: CallScoringCategorySlug;
  weight: number;
  developing: string;
}): DefaultScoringCategoryDefinition {
  return {
    id: null,
    slug: input.slug,
    name: input.name,
    description: input.description,
    weight: input.weight,
    scoringCriteria: {
      excellent: input.excellent,
      proficient: input.proficient,
      developing: input.developing,
      lookFor: input.lookFor,
    },
    legacyScoreField: input.legacyScoreField,
  };
}

export const CALL_SCORING_CATEGORIES: DefaultScoringCategoryDefinition[] = [
  createDefaultCategory({
    slug: "rapport",
    legacyScoreField: "rapportScore",
    name: "Build Rapport",
    weight: 5,
    description:
      "Evaluate whether the rep quickly establishes professional credibility, earns engagement, and opens with relevant context instead of filler.",
    excellent:
      "Establishes a professional tone quickly, makes a relevant connection, and transitions into business purpose without wasting time.",
    proficient:
      "Builds reasonable trust and keeps the opening professional, but leaves some value on the table in relevance or momentum.",
    developing:
      "Uses forced small talk, sounds transactional, or creates friction in the opening moments of the call.",
    lookFor: [
      "Relevant opening context",
      "Professional tone",
      "Efficient transition into the call objective",
    ],
  }),
  createDefaultCategory({
    slug: "frame_control",
    legacyScoreField: "frameControlScore",
    name: "Set a Strong Frame",
    weight: 15,
    description:
      "Evaluate whether the rep sets expectations, confirms time, aligns on agenda, and maintains control of the conversation flow.",
    excellent:
      "Confirms time, sets the agenda, earns agreement, and keeps the conversation on track with clear transitions.",
    proficient:
      "Creates enough structure for the conversation to move productively, but with some weak transitions or drift.",
    developing:
      "Lets the call drift, skips the opening contract, or jumps straight into demo mode without setting expectations.",
    lookFor: [
      "Time check",
      "Agenda and decision framing",
      "Clear transitions between call sections",
    ],
  }),
  createDefaultCategory({
    slug: "discovery",
    legacyScoreField: "discoveryScore",
    name: "In-Depth Discovery",
    weight: 15,
    description:
      "Evaluate whether discovery goes beyond surface symptoms into business pain, urgency, decision process, and consequences of inaction.",
    excellent:
      "Surfaces pain, impact, urgency, consequences of inaction, current alternatives, stakeholders, and decision criteria.",
    proficient:
      "Gets to meaningful pain and context, but misses at least one major dimension like urgency, stakeholders, or decision criteria.",
    developing:
      "Stays at the symptom level, asks checklist questions, or starts pitching before the business problem is clear.",
    lookFor: [
      "Pain and business impact",
      "Urgency and consequences of inaction",
      "Stakeholders and decision criteria",
    ],
  }),
  createDefaultCategory({
    slug: "pain_expansion",
    legacyScoreField: "painExpansionScore",
    name: "Transition to Pitch",
    weight: 5,
    description:
      "Evaluate whether the rep bridges discovery into the pitch by recapping the pain in the buyer's language and earning permission to present.",
    excellent:
      "Recaps the problem in the buyer's language, gets confirmation, and earns the right to present a focused solution.",
    proficient:
      "Creates a workable bridge into the solution, but the recap or permission step feels generic or rushed.",
    developing:
      "Makes an abrupt pivot into product talk or gives a generic recap that does not connect to what the buyer actually said.",
    lookFor: [
      "Pain recap in the buyer's language",
      "Confirmation before presenting",
      "Clear bridge into the solution",
    ],
  }),
  createDefaultCategory({
    slug: "solution",
    legacyScoreField: "solutionScore",
    name: "Pitch/Demo",
    weight: 15,
    description:
      "Evaluate whether the rep maps the solution to confirmed needs, uses proof, and checks relevance instead of dumping features.",
    excellent:
      "Tailors the solution to verified needs, uses proof, and checks understanding instead of feature-dumping.",
    proficient:
      "Generally connects the solution to the buyer's needs, but with occasional generic sections or limited proof.",
    developing:
      "Runs a generic product tour, over-explains features, or makes claims without grounding them in the buyer's problem.",
    lookFor: [
      "Need-to-solution mapping",
      "Specific proof points",
      "Understanding checks during the demo or pitch",
    ],
  }),
  createDefaultCategory({
    slug: "objection_handling",
    legacyScoreField: "objectionScore",
    name: "Overcome Objections",
    weight: 15,
    description:
      "Evaluate whether the rep clarifies the real concern, responds specifically, and confirms the objection is resolved enough to move forward.",
    excellent:
      "Clarifies the real concern, isolates it, responds with specifics, and confirms whether the concern is resolved enough to proceed.",
    proficient:
      "Handles the objection competently, but with limited isolation, incomplete specificity, or weak confirmation of movement.",
    developing:
      "Gets defensive, answers the wrong objection, discounts too early, or leaves concerns unresolved.",
    lookFor: [
      "Acknowledgment and clarification",
      "Specific response to the real concern",
      "Confirmation of movement after the answer",
    ],
  }),
  createDefaultCategory({
    slug: "closing",
    legacyScoreField: "closingScore",
    name: "Closing",
    weight: 30,
    description:
      "Evaluate whether the rep asks directly for the right next commitment and leaves the call with clear owners, dates, and next steps.",
    excellent:
      "Secures a concrete next step with owners, timing, and a clear stage-appropriate commitment.",
    proficient:
      "Leaves the call with a next step, but without full specificity on owners, timing, or commitment strength.",
    developing:
      "Ends with vague follow-up, lets the buyer own all next steps, or fails to ask directly for commitment.",
    lookFor: [
      "Explicit ask",
      "Named owner and timing",
      "Stage-appropriate commitment",
    ],
  }),
];

export const LEGACY_CALL_SCORE_FIELDS_BY_SLUG: Record<CallScoringCategorySlug, CallScoreField> =
  CALL_SCORING_CATEGORIES.reduce(
    (fields, category) => ({
      ...fields,
      [category.slug]: category.legacyScoreField,
    }),
    {} as Record<CallScoringCategorySlug, CallScoreField>,
  );

export const CALL_SCORE_LABELS_BY_FIELD: Record<CallScoreField, string> = CALL_SCORING_CATEGORIES
  .reduce(
    (labels, category) => ({
      ...labels,
      [category.legacyScoreField]: category.name,
    }),
    {} as Record<CallScoreField, string>,
  );

export const CALL_SCORE_LABELS_BY_SLUG: Record<CallScoringCategorySlug, string> = CALL_SCORING_CATEGORIES
  .reduce(
    (labels, category) => ({
      ...labels,
      [category.slug]: category.name,
    }),
    {} as Record<CallScoringCategorySlug, string>,
  );

export const DEFAULT_CALL_SCORING_RUBRIC: ScoringRubric = {
  id: null,
  name: "Revenue Scorecard",
  version: null,
  categories: CALL_SCORING_CATEGORIES.map(({ legacyScoreField: _legacyScoreField, ...category }) => ({
    ...category,
  })),
};

export function validateScoringRubric(rubric: ScoringRubric) {
  if (!rubric.categories.length) {
    throw new Error("Scoring rubric must include at least one category");
  }

  const seenSlugs = new Set<string>();
  for (const category of rubric.categories) {
    if (!category.slug.trim()) {
      throw new Error("Scoring rubric categories must include a slug");
    }

    if (seenSlugs.has(category.slug)) {
      throw new Error(`Scoring rubric category slug "${category.slug}" is duplicated`);
    }
    seenSlugs.add(category.slug);

    if (!Number.isFinite(category.weight) || category.weight <= 0) {
      throw new Error(`Scoring rubric category "${category.slug}" must have a positive weight`);
    }
  }

  return rubric;
}

export function computeWeightedOverallScore(
  scores: Record<string, number>,
  rubric: ScoringRubric = DEFAULT_CALL_SCORING_RUBRIC,
) {
  const validatedRubric = validateScoringRubric(rubric);
  const totalWeight = validatedRubric.categories.reduce(
    (sum, category) => sum + category.weight,
    0,
  );

  if (totalWeight <= 0) {
    return 0;
  }

  const weightedSum = validatedRubric.categories.reduce(
    (sum, category) => sum + category.weight * (scores[category.slug] ?? 0),
    0,
  );

  return Math.round(weightedSum / totalWeight);
}

export function buildCallScoringSystemPrompt(
  rubric: ScoringRubric = DEFAULT_CALL_SCORING_RUBRIC,
) {
  const validatedRubric = validateScoringRubric(rubric);
  const categorySchema = validatedRubric.categories
    .map((category) => `    "${category.slug}": number`)
    .join(",\n");
  const categoryMomentSchema = validatedRubric.categories
    .map((category) => `"${category.slug}"`)
    .join(" | ");
  const callStageSchema = CALL_STAGE_REACHED_VALUES.map((stage) => `"${stage}"`).join(" | ");
  const rubricText = validatedRubric.categories
    .map((category) =>
      [
        `${category.name} (${category.slug}, weight ${category.weight})`,
        `Description: ${category.description}`,
        `Excellent: ${category.scoringCriteria.excellent}`,
        `Proficient: ${category.scoringCriteria.proficient}`,
        `Developing: ${category.scoringCriteria.developing}`,
        `Look for: ${category.scoringCriteria.lookFor.join("; ") || "No additional markers provided."}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    "You are a seasoned enterprise sales executive with more than 20 years of frontline coaching experience.",
    "Evaluate only what is observable in the transcript. Do not invent evidence or infer strong execution where the transcript does not support it.",
    "Score each category on a 0-100 scale using these anchors: 90-100 elite, 80-89 strong, 70-79 workable, 60-69 weak, 0-59 poor or missing.",
    "Return strict JSON with exactly these top-level keys:",
    "{",
    '  "confidence": "high" | "medium" | "low",',
    `  "callStageReached": ${callStageSchema},`,
    '  "categoryScores": {',
    categorySchema,
    "  },",
    '  "strengths": string[],',
    '  "improvements": string[],',
    '  "recommendedDrills": string[],',
    '  "moments": Array<{',
    '    "timestampSeconds": number,',
    `    "category": ${categoryMomentSchema},`,
    '    "observation": string,',
    '    "recommendation": string,',
    '    "severity": "strength" | "improvement" | "critical",',
    '    "isHighlight": boolean,',
    '    "highlightNote": string | null',
    "  }>",
    "}",
    "Return 2-3 strengths, 2-3 improvements, 1-3 recommended drills, and 1-5 moments.",
    "Rubric:",
    rubricText,
  ].join("\n");
}
