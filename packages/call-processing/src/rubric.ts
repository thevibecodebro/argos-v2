import type { CallEvaluation } from "./types";

export type CallScoringCategorySlug =
  | "rapport"
  | "frame_control"
  | "discovery"
  | "pain_expansion"
  | "solution"
  | "objection_handling"
  | "closing";

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

type CallScoringCategoryDefinition = {
  slug: CallScoringCategorySlug;
  scoreField: CallScoreField;
  label: string;
  weight: number;
  goodLooksLike: string;
  poorLooksLike: string;
  coachingGuidance: string;
};

export const CALL_SCORING_CATEGORIES: CallScoringCategoryDefinition[] = [
  {
    slug: "rapport",
    scoreField: "rapportScore",
    label: "Build Rapport",
    weight: 5,
    goodLooksLike:
      "Establishes a professional tone quickly, makes a relevant connection, and transitions into business purpose without wasting time.",
    poorLooksLike:
      "Uses forced small talk, sounds transactional, or creates friction in the opening moments of the call.",
    coachingGuidance:
      "Tighten the first minute: relevant context, a time check, and a clean pivot into the call objective.",
  },
  {
    slug: "frame_control",
    scoreField: "frameControlScore",
    label: "Set a Strong Frame",
    weight: 15,
    goodLooksLike:
      "Confirms time, sets the agenda, earns agreement, and keeps the conversation on track with clear transitions.",
    poorLooksLike:
      "Lets the call drift, skips the opening contract, or jumps straight into demo mode without setting expectations.",
    coachingGuidance:
      "Use a repeatable opening: time, purpose, agenda, and the end-of-call decision you want to reach.",
  },
  {
    slug: "discovery",
    scoreField: "discoveryScore",
    label: "In-Depth Discovery",
    weight: 15,
    goodLooksLike:
      "Surfaces pain, impact, urgency, consequences of inaction, current alternatives, stakeholders, and decision criteria.",
    poorLooksLike:
      "Stays at the symptom level, asks checklist questions, or starts pitching before the business problem is clear.",
    coachingGuidance:
      "Push beyond surface pain: why now, what happens if nothing changes, who is involved, and how the decision gets made.",
  },
  {
    slug: "pain_expansion",
    scoreField: "painExpansionScore",
    label: "Transition to Pitch",
    weight: 5,
    goodLooksLike:
      "Recaps the problem in the buyer’s language, gets confirmation, and earns the right to present a focused solution.",
    poorLooksLike:
      "Makes an abrupt pivot into product talk or gives a generic recap that does not connect to what the buyer actually said.",
    coachingGuidance:
      "Use a 30-second bridge: recap, confirm, map what you will show, and ask permission to move there.",
  },
  {
    slug: "solution",
    scoreField: "solutionScore",
    label: "Pitch/Demo",
    weight: 15,
    goodLooksLike:
      "Tailors the solution to verified needs, uses proof, and checks understanding instead of feature-dumping.",
    poorLooksLike:
      "Runs a generic product tour, over-explains features, or makes claims without grounding them in the buyer’s problem.",
    coachingGuidance:
      "Map each major proof point to a previously verified need and check for relevance after every major section.",
  },
  {
    slug: "objection_handling",
    scoreField: "objectionScore",
    label: "Overcome Objections",
    weight: 15,
    goodLooksLike:
      "Clarifies the real concern, isolates it, responds with specifics, and confirms whether the concern is resolved enough to proceed.",
    poorLooksLike:
      "Gets defensive, answers the wrong objection, discounts too early, or leaves concerns unresolved.",
    coachingGuidance:
      "Use the same sequence every time: acknowledge, clarify, isolate, answer with specifics, then confirm movement.",
  },
  {
    slug: "closing",
    scoreField: "closingScore",
    label: "Closing",
    weight: 30,
    goodLooksLike:
      "Secures a concrete next step with owners, timing, and a clear stage-appropriate commitment.",
    poorLooksLike:
      "Ends with vague follow-up, lets the buyer own all next steps, or fails to ask directly for commitment.",
    coachingGuidance:
      "Close to the stage: explicit ask, exact next step, owner, attendees, and calendar date.",
  },
];

export const CALL_SCORE_LABELS_BY_FIELD: Record<CallScoreField, string> =
  CALL_SCORING_CATEGORIES.reduce(
    (labels, category) => ({
      ...labels,
      [category.scoreField]: category.label,
    }),
    {} as Record<CallScoreField, string>,
  );

export const CALL_SCORE_LABELS_BY_SLUG: Record<CallScoringCategorySlug, string> =
  CALL_SCORING_CATEGORIES.reduce(
    (labels, category) => ({
      ...labels,
      [category.slug]: category.label,
    }),
    {} as Record<CallScoringCategorySlug, string>,
  );

export function computeWeightedOverallScore(
  scores: Record<CallScoringCategorySlug, number>,
) {
  const weightedSum = CALL_SCORING_CATEGORIES.reduce(
    (sum, category) => sum + category.weight * scores[category.slug],
    0,
  );

  return Math.round(weightedSum / 100);
}

export function buildCallScoringSystemPrompt() {
  const rubric = CALL_SCORING_CATEGORIES.map((category) =>
    [
      `${category.label} (${category.slug}, weight ${category.weight})`,
      `Good looks like: ${category.goodLooksLike}`,
      `Poor performance: ${category.poorLooksLike}`,
      `Coaching guidance: ${category.coachingGuidance}`,
    ].join("\n"),
  ).join("\n\n");

  return [
    "You are a seasoned enterprise sales executive with more than 20 years of frontline coaching experience.",
    "Evaluate only what is observable in the transcript. Do not invent evidence or infer strong execution where the transcript does not support it.",
    "Score each category on a 0-100 scale using these anchors: 90-100 elite, 80-89 strong, 70-79 workable, 60-69 weak, 0-59 poor or missing.",
    "Return strict JSON with exactly these top-level keys:",
    "{",
    '  "confidence": "high" | "medium" | "low",',
    '  "callStageReached": "opening" | "discovery" | "proposal" | "objection_handling" | "commitment" | "closed_won" | "closed_lost",',
    '  "categoryScores": {',
    '    "rapport": number,',
    '    "frame_control": number,',
    '    "discovery": number,',
    '    "pain_expansion": number,',
    '    "solution": number,',
    '    "objection_handling": number,',
    '    "closing": number',
    "  },",
    '  "strengths": string[],',
    '  "improvements": string[],',
    '  "recommendedDrills": string[],',
    '  "moments": Array<{',
    '    "timestampSeconds": number,',
    '    "category": "rapport" | "frame_control" | "discovery" | "pain_expansion" | "solution" | "objection_handling" | "closing",',
    '    "observation": string,',
    '    "recommendation": string,',
    '    "severity": "strength" | "improvement" | "critical",',
    '    "isHighlight": boolean,',
    '    "highlightNote": string | null',
    "  }>",
    "}",
    "Return 2-3 strengths, 2-3 improvements, 1-3 recommended drills, and 1-5 moments.",
    "Rubric:",
    rubric,
  ].join("\n");
}
