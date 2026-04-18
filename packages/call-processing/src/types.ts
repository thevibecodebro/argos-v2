export type TranscriptLine = {
  timestampSeconds: number;
  speaker: string;
  text: string;
};

export type CallMomentSeverity = "strength" | "improvement" | "critical";

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
  confidence: "high" | "medium" | "low";
  durationSeconds: number;
  callStageReached: string;
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
