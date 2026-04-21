export const CALL_SCORING_CATEGORY_SLUGS = [
  "rapport",
  "frame_control",
  "discovery",
  "pain_expansion",
  "solution",
  "objection_handling",
  "closing",
] as const;

export type CallScoringCategorySlug = (typeof CALL_SCORING_CATEGORY_SLUGS)[number];

export const CALL_STAGE_REACHED_VALUES = [
  "opening",
  "discovery",
  "proposal",
  "objection_handling",
  "commitment",
  "closed_won",
  "closed_lost",
] as const;

export type CallStageReached = (typeof CALL_STAGE_REACHED_VALUES)[number];

export type TranscriptLine = {
  timestampSeconds: number;
  speaker: string;
  text: string;
};

export type CallMomentSeverity = "strength" | "improvement" | "critical";

export type ScoringCriteria = {
  excellent: string;
  proficient: string;
  developing: string;
  lookFor: string[];
};

export type ScoringRubricCategory = {
  id: string | null;
  slug: string;
  name: string;
  description: string;
  weight: number;
  scoringCriteria: ScoringCriteria;
};

export type ScoringRubric = {
  id: string | null;
  name: string;
  version: number | null;
  categories: ScoringRubricCategory[];
};

export type CallCategoryScore = {
  categoryId: string | null;
  slug: string;
  name: string;
  weight: number;
  score: number;
};

export type CallEvaluationMoment = {
  timestampSeconds: number;
  category: string;
  observation: string;
  recommendation: string;
  severity: CallMomentSeverity;
  isHighlight: boolean;
  highlightNote: string | null;
};

export type CallEvaluation = {
  rubricId: string | null;
  confidence: "high" | "medium" | "low";
  durationSeconds: number;
  callStageReached: CallStageReached;
  overallScore: number;
  categoryScores: CallCategoryScore[];
  frameControlScore: number | null;
  rapportScore: number | null;
  discoveryScore: number | null;
  painExpansionScore: number | null;
  solutionScore: number | null;
  objectionScore: number | null;
  closingScore: number | null;
  strengths: string[];
  improvements: string[];
  recommendedDrills: string[];
  transcript: TranscriptLine[];
  moments: CallEvaluationMoment[];
};
