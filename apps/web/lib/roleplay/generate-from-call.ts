import type { CallDetail } from "@/lib/calls/service";
import { CALL_SCORING_CATEGORIES } from "@/lib/calls/rubric";
import type { RubricWithCategories } from "@/lib/rubrics/types";
import type { RoleplayRepository } from "./service";
import type {
  RoleplayMessage,
  RoleplaySession,
  RoleplaySessionRecord,
} from "./types";

export type GeneratedRoleplayFocusOption = {
  slug: string;
  label: string;
};

export type GeneratedRoleplayPreview = {
  defaultFocusSlug: "all";
  focusOptions: GeneratedRoleplayFocusOption[];
  scenarioSummary: string;
  scenarioBrief: string;
};

type GeneratedRoleplayPreviewCall = Pick<
  CallDetail,
  | "overallScore"
  | "callStageReached"
  | "closingScore"
  | "discoveryScore"
  | "frameControlScore"
  | "moments"
  | "objectionScore"
  | "painExpansionScore"
  | "rapportScore"
  | "solutionScore"
>;

type GeneratedRoleplayCreateCall = GeneratedRoleplayPreviewCall & Pick<CallDetail, "id">;

type GeneratedRoleplayPreviewInput = {
  call: GeneratedRoleplayPreviewCall;
  activeRubric: RubricWithCategories | null;
};

type GeneratedRoleplaySessionInput = GeneratedRoleplayPreviewInput & {
  call: GeneratedRoleplayCreateCall;
  focusCategorySlug: string | null;
};

type GeneratedRoleplayResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 403; error: string };

const GENERATED_ROLEPLAY_DEFAULT_OPENING =
  "Keep this practical for me. Why does this matter now, and what changes if I say yes?";

const GENERATED_ROLEPLAY_CATEGORY_OPENERS: Record<string, string> = {
  closing: "Before we wrap, what exactly happens next if I move this forward?",
  discovery: "Walk me through the problem and why changing it now matters.",
  frame_control: "Start at the beginning. Why should I treat this as a priority now?",
  objection_handling: "I still have one major concern. Address that directly.",
  pain_expansion: "Show me where the pain is showing up and what it costs.",
  rapport: "Keep this straightforward. Why should I trust this conversation?",
  solution: "Explain the outcome plainly and give me the strongest proof.",
};

function formatCategoryLabel(slug: string) {
  const normalized = slug.replace(/[_-]+/g, " ").trim();

  if (!normalized) {
    return "this area";
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

function joinHumanList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function getFocusOptions(activeRubric: RubricWithCategories | null): GeneratedRoleplayFocusOption[] {
  const categories = [...(activeRubric?.categories ?? [])].sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });

  return [
    { slug: "all", label: "All" },
    ...categories.map((category) => ({
      slug: category.slug,
      label: category.name,
    })),
  ];
}

function getSignalLabels(call: GeneratedRoleplayPreviewInput["call"]) {
  const labels: string[] = [];
  const seen = new Set<string>();

  const scoreBySlug = {
    closing: call.closingScore,
    discovery: call.discoveryScore,
    frame_control: call.frameControlScore,
    objection_handling: call.objectionScore,
    pain_expansion: call.painExpansionScore,
    rapport: call.rapportScore,
    solution: call.solutionScore,
  } as const;

  for (const category of [...CALL_SCORING_CATEGORIES].sort((left, right) => {
    const leftScore = scoreBySlug[left.slug] ?? Number.POSITIVE_INFINITY;
    const rightScore = scoreBySlug[right.slug] ?? Number.POSITIVE_INFINITY;

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return left.label.localeCompare(right.label);
  })) {
    const score = scoreBySlug[category.slug];

    if (score == null) {
      continue;
    }

    if (!seen.has(category.label)) {
      seen.add(category.label);
      labels.push(category.label);
    }

    if (labels.length === 2) {
      return labels;
    }
  }

  for (const moment of call.moments) {
    if (!moment.category) {
      continue;
    }

    const label = formatCategoryLabel(moment.category);

    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }

    if (labels.length === 2) {
      return labels;
    }
  }

  return labels;
}

function getStageSummary(callStageReached: string | null) {
  const stage = callStageReached?.toLowerCase() ?? "";

  if (stage.includes("close") || stage.includes("commit")) {
    return "The conversation stalled near the finish and needs a firmer close.";
  }

  if (stage.includes("objection")) {
    return "The rep needs a sharper answer to buyer pushback.";
  }

  if (stage.includes("discovery")) {
    return "The rep needs deeper discovery before moving into solution talk.";
  }

  if (stage.includes("solution")) {
    return "The rep needs stronger proof before leaning on the solution.";
  }

  if (stage.includes("opening")) {
    return "The rep needs a cleaner opening and a clearer reason to continue.";
  }

  return "The rep needs a clearer coaching moment and a stronger next step.";
}

function buildScenarioSummary(call: GeneratedRoleplayPreviewInput["call"]) {
  const scoreSentence =
    call.overallScore == null
      ? "An anonymized buyer wants a clearer path forward."
      : call.overallScore < 65
        ? "An anonymized buyer wants clearer proof and a more decisive next step."
        : call.overallScore < 80
          ? "An anonymized buyer wants stronger proof and tighter next-step control."
          : "An anonymized buyer wants the rep to stay crisp under pressure.";
  const stageSentence = getStageSummary(call.callStageReached);
  const signalLabels = getSignalLabels(call);
  const signalSentence = signalLabels.length
    ? `This practice should pressure-test ${joinHumanList(signalLabels)}.`
    : null;

  return [scoreSentence, stageSentence, signalSentence].filter(Boolean).join(" ");
}

function buildScenarioBrief(call: GeneratedRoleplayPreviewInput["call"]) {
  const signalLabels = getSignalLabels(call);
  const focusPhrase = signalLabels.length
    ? joinHumanList(signalLabels).toLowerCase()
    : "proof and next-step clarity";

  return `Derived from a real call. Stay concise, skeptical, and push on ${focusPhrase}.`;
}

function normalizeFocusCategorySlug(focusCategorySlug: string | null) {
  const trimmed = focusCategorySlug?.trim();

  if (!trimmed || trimmed === "all") {
    return null;
  }

  return trimmed;
}

function buildAssistantOpeningLine(focusCategorySlug: string | null) {
  const normalizedFocusCategorySlug = normalizeFocusCategorySlug(focusCategorySlug);

  if (!normalizedFocusCategorySlug) {
    return GENERATED_ROLEPLAY_DEFAULT_OPENING;
  }

  return (
    GENERATED_ROLEPLAY_CATEGORY_OPENERS[normalizedFocusCategorySlug] ??
    `Keep this focused on ${formatCategoryLabel(normalizedFocusCategorySlug).toLowerCase()}. What is the clearest next step?`
  );
}

function serializeGeneratedRoleplaySession(
  session: RoleplaySessionRecord,
): RoleplaySession {
  return {
    id: session.id,
    repId: session.repId,
    orgId: session.orgId,
    persona: session.persona,
    personaDetails: null,
    industry: session.industry,
    difficulty: session.difficulty,
    overallScore: session.overallScore,
    origin: session.origin,
    sourceCallId: session.sourceCallId,
    rubricId: session.rubricId,
    focusMode: session.focusMode,
    focusCategorySlug: session.focusCategorySlug,
    scenarioSummary: session.scenarioSummary,
    scenarioBrief: session.scenarioBrief,
    transcript: Array.isArray(session.transcript) ? session.transcript : [],
    scorecard: session.scorecard,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
  };
}

function buildGeneratedRoleplaySessionCreateInput(
  viewerId: string,
  viewerOrgId: string,
  input: GeneratedRoleplaySessionInput,
) {
  const preview = buildGeneratedRoleplayPreview(input);
  const focusCategorySlug = normalizeFocusCategorySlug(input.focusCategorySlug);
  const transcript: RoleplayMessage[] = [
    {
      role: "assistant",
      content: buildAssistantOpeningLine(focusCategorySlug),
    },
  ];

  if (focusCategorySlug) {
    return {
      difficulty: "intermediate" as const,
      industry: null,
      orgId: viewerOrgId,
      persona: null,
      repId: viewerId,
      scorecard: null,
      status: "active" as const,
      transcript,
      origin: "generated_from_call" as const,
      sourceCallId: input.call.id,
      rubricId: input.activeRubric?.id ?? null,
      focusMode: "category" as const,
      focusCategorySlug,
      scenarioSummary: preview.scenarioSummary,
      scenarioBrief: buildScenarioBrief(input.call),
    };
  }

  return {
    difficulty: "intermediate" as const,
    industry: null,
    orgId: viewerOrgId,
    persona: null,
    repId: viewerId,
    scorecard: null,
    status: "active" as const,
    transcript,
    origin: "generated_from_call" as const,
    sourceCallId: input.call.id,
    rubricId: input.activeRubric?.id ?? null,
    focusMode: "all" as const,
    focusCategorySlug: null,
    scenarioSummary: preview.scenarioSummary,
    scenarioBrief: buildScenarioBrief(input.call),
  };
}

export function buildGeneratedRoleplayPreview(
  input: GeneratedRoleplayPreviewInput,
): GeneratedRoleplayPreview {
  return {
    defaultFocusSlug: "all",
    focusOptions: getFocusOptions(input.activeRubric),
    scenarioSummary: buildScenarioSummary(input.call),
    scenarioBrief: buildScenarioBrief(input.call),
  };
}

export async function createGeneratedRoleplaySession(
  repository: RoleplayRepository,
  authUserId: string,
  input: GeneratedRoleplaySessionInput,
): Promise<GeneratedRoleplayResult<RoleplaySession>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer?.org) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  const session = await repository.createSession(
    buildGeneratedRoleplaySessionCreateInput(viewer.id, viewer.org.id, input),
  );

  return {
    ok: true,
    data: serializeGeneratedRoleplaySession(session),
  };
}
