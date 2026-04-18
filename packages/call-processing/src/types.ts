export const CALL_SCORING_CATEGORY_SLUGS = [
  "rapport",
  "frame_control",
  "discovery",
  "pain_expansion",
  "solution",
  "objection_handling",
  "closing",
] as const;

export type CallScoringCategorySlug =
  (typeof CALL_SCORING_CATEGORY_SLUGS)[number];

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

export type CallEvaluationMoment = {
  timestampSeconds: number;
  category: CallScoringCategorySlug;
  observation: string;
  recommendation: string;
  severity: CallMomentSeverity;
  isHighlight: boolean;
  highlightNote: string | null;
};

export type CallEvaluation = {
  confidence: "high" | "medium" | "low";
  durationSeconds: number;
  callStageReached: CallStageReached;
  overallScore: number;
  frameControlScore: number;
  rapportScore: number;
  discoveryScore: number;
  painExpansionScore: number;
  solutionScore: number;
  objectionScore: number;
  closingScore: number;
  strengths: string[];
  improvements: string[];
  recommendedDrills: string[];
  transcript: TranscriptLine[];
  moments: CallEvaluationMoment[];
};
