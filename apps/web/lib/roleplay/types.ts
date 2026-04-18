export const ROLEPLAY_CATEGORY_LABELS = {
  closing: "Closing",
  discovery: "Discovery",
  frame_control: "Frame Control",
  objection_handling: "Objection Handling",
  pain_expansion: "Pain Expansion",
  rapport: "Rapport",
  solution: "Solution",
} as const;

export type RoleplayCategory = keyof typeof ROLEPLAY_CATEGORY_LABELS;

export type RoleplayPersona = {
  id: string;
  name: string;
  role: string;
  company: string;
  industry: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  objectionType: string;
  description: string;
  avatarInitials: string;
};

export type RoleplayMessage = {
  role: "assistant" | "user";
  content: string;
};

export type RoleplayScorecard = {
  callStageReached: "opening" | "discovery" | "solution" | "objection_handling" | "commitment";
  categoryScores: Record<RoleplayCategory, number | null>;
  confidence: "high" | "medium" | "low";
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedDrills: string[];
  moments: Array<{
    category: RoleplayCategory;
    severity: "strength" | "improvement" | "critical";
    observation: string;
    recommendation: string;
  }>;
};

export type RoleplaySession = {
  id: string;
  repId: string;
  orgId: string;
  persona: string | null;
  personaDetails: RoleplayPersona | null;
  industry: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  overallScore: number | null;
  transcript: RoleplayMessage[];
  scorecard: RoleplayScorecard | null;
  status: "active" | "evaluating" | "complete";
  createdAt: string;
  startedAt: string | null;
  lastActivityAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
};

export type RoleplaySessionRecord = {
  id: string;
  repId: string;
  orgId: string;
  persona: string | null;
  industry: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  overallScore: number | null;
  transcript: RoleplayMessage[] | null;
  scorecard: RoleplayScorecard | null;
  status: "active" | "evaluating" | "complete";
  createdAt: Date;
  startedAt: Date | null;
  lastActivityAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
};
