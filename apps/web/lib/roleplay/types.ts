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

export type RoleplayVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse"
  | "marin"
  | "cedar";

export type GeneratedRoleplayBuyerVoice = "male" | "female";

export const DEFAULT_GENERATED_ROLEPLAY_BUYER_VOICE: GeneratedRoleplayBuyerVoice = "male";

export const GENERATED_ROLEPLAY_BUYER_PERSONAS: Record<
  GeneratedRoleplayBuyerVoice,
  { label: string; persona: string; voice: RoleplayVoice }
> = {
  female: {
    label: "Female",
    persona: "generated-female-buyer",
    voice: "marin",
  },
  male: {
    label: "Male",
    persona: "generated-male-buyer",
    voice: "cedar",
  },
};

export const GENERATED_ROLEPLAY_VOICE: RoleplayVoice =
  GENERATED_ROLEPLAY_BUYER_PERSONAS[DEFAULT_GENERATED_ROLEPLAY_BUYER_VOICE].voice;

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
  voice: RoleplayVoice;
};

export type RoleplayMessage = {
  role: "assistant" | "user";
  content: string;
};

export type RoleplaySessionCreateBase = {
  difficulty: "beginner" | "intermediate" | "advanced";
  industry: string | null;
  orgId: string;
  persona: string | null;
  repId: string;
  scorecard: RoleplayScorecard | null;
  status: "active" | "evaluating" | "complete";
  transcript: RoleplayMessage[];
  rubricId?: string | null;
  scenarioSummary?: string | null;
  scenarioBrief?: string | null;
};

type OriginRoleplaySessionCreateInput =
  | {
      origin?: "manual";
      sourceCallId?: null;
    }
  | {
      origin: "generated_from_call";
      sourceCallId: string;
    };

type FocusRoleplaySessionCreateInput =
  | {
      focusMode?: "all";
      focusCategorySlug?: null;
    }
  | {
      focusMode: "category";
      focusCategorySlug: string;
    };

export type RoleplaySessionCreateInput = RoleplaySessionCreateBase &
  OriginRoleplaySessionCreateInput &
  FocusRoleplaySessionCreateInput;

type NormalizedRoleplaySessionCreateInput = RoleplaySessionCreateBase & {
  origin: "manual" | "generated_from_call";
  sourceCallId: string | null;
  focusMode: "all" | "category";
  focusCategorySlug: string | null;
  rubricId: string | null;
  scenarioSummary: string | null;
  scenarioBrief: string | null;
};

export type RoleplayScorecard = {
  rubricId?: string | null;
  rubricName?: string | null;
  rubricVersion?: number | null;
  callStageReached: "opening" | "discovery" | "solution" | "objection_handling" | "commitment";
  categoryScores: Record<string, number | null>;
  categoryLabels?: Record<string, string>;
  confidence: "high" | "medium" | "low";
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedDrills: string[];
  moments: Array<{
    category: string;
    severity: "strength" | "improvement" | "critical";
    observation: string;
    recommendation: string;
  }>;
};

export type RoleplaySessionOrigin = "manual" | "generated_from_call";

export type RoleplaySessionFocusMode = "all" | "category";

export type RoleplaySessionMetadata = {
  origin: RoleplaySessionOrigin;
  sourceCallId: string | null;
  rubricId: string | null;
  focusMode: RoleplaySessionFocusMode;
  focusCategorySlug: string | null;
  scenarioSummary: string | null;
  scenarioBrief: string | null;
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
  origin: RoleplaySessionOrigin;
  sourceCallId: string | null;
  rubricId: string | null;
  focusMode: RoleplaySessionFocusMode;
  focusCategorySlug: string | null;
  scenarioSummary: string | null;
  scenarioBrief: string | null;
  transcript: RoleplayMessage[];
  scorecard: RoleplayScorecard | null;
  status: "active" | "evaluating" | "complete";
  createdAt: string;
};

export type RoleplaySessionRecord = {
  id: string;
  repId: string;
  orgId: string;
  persona: string | null;
  industry: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  overallScore: number | null;
  origin: RoleplaySessionOrigin;
  sourceCallId: string | null;
  rubricId: string | null;
  focusMode: RoleplaySessionFocusMode;
  focusCategorySlug: string | null;
  scenarioSummary: string | null;
  scenarioBrief: string | null;
  transcript: RoleplayMessage[] | null;
  scorecard: RoleplayScorecard | null;
  status: "active" | "evaluating" | "complete";
  createdAt: Date;
};

export function getRoleplaySessionVoice(
  session: Pick<RoleplaySession, "origin" | "persona" | "personaDetails">,
) {
  if (session.personaDetails?.voice) {
    return session.personaDetails.voice;
  }

  if (session.origin !== "generated_from_call") {
    return undefined;
  }

  return getGeneratedRoleplayVoiceByPersona(session.persona) ?? GENERATED_ROLEPLAY_VOICE;
}

export function normalizeGeneratedRoleplayBuyerVoice(
  value: unknown,
): GeneratedRoleplayBuyerVoice {
  return value === "female" ? "female" : DEFAULT_GENERATED_ROLEPLAY_BUYER_VOICE;
}

export function getGeneratedRoleplayPersonaId(value: GeneratedRoleplayBuyerVoice) {
  return GENERATED_ROLEPLAY_BUYER_PERSONAS[value].persona;
}

function getGeneratedRoleplayVoiceByPersona(persona: string | null) {
  return Object.values(GENERATED_ROLEPLAY_BUYER_PERSONAS).find(
    (option) => option.persona === persona,
  )?.voice;
}

export function normalizeRoleplaySessionCreateInput(
  input: RoleplaySessionCreateInput,
): NormalizedRoleplaySessionCreateInput {
  const origin = input.origin ?? "manual";
  const sourceCallId = input.sourceCallId ?? null;
  const focusMode = input.focusMode ?? "all";
  const focusCategorySlug = input.focusCategorySlug ?? null;

  if (origin === "manual" && sourceCallId !== null) {
    throw new Error("Manual roleplay sessions cannot reference a source call");
  }

  if (origin === "generated_from_call" && !sourceCallId) {
    throw new Error("Generated roleplay sessions require a source call");
  }

  if (focusMode === "category" && !focusCategorySlug) {
    throw new Error("Category-focused roleplay sessions require a focus category");
  }

  if (focusMode === "all" && focusCategorySlug !== null) {
    throw new Error("All-focus roleplay sessions cannot set a focus category");
  }

  const normalized = {
    ...input,
    origin,
    sourceCallId,
    focusMode,
    focusCategorySlug,
    rubricId: input.rubricId ?? null,
    scenarioSummary: input.scenarioSummary ?? null,
    scenarioBrief: input.scenarioBrief ?? null,
  };

  return normalized as NormalizedRoleplaySessionCreateInput;
}
