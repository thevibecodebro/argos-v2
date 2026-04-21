import "server-only";
import { buildAccessContext, canActorViewRep, type AccessContext } from "@/lib/access/service";
import type { DashboardUserRecord } from "@/lib/dashboard/service";
import {
  normalizeRoleplaySessionCreateInput,
  ROLEPLAY_CATEGORY_LABELS,
  type RoleplayCategory,
  type RoleplaySessionCreateInput,
  type RoleplayMessage,
  type RoleplayPersona,
  type RoleplayScorecard,
  type RoleplaySession,
  type RoleplaySessionRecord,
} from "./types";

export type { RoleplayScorecard, RoleplaySession, RoleplaySessionRecord };

export { normalizeRoleplaySessionCreateInput };
export type { RoleplaySessionCreateInput };

type LegacyRoleplayScorecard = {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedDrills: string[];
  moments: Array<{
    title?: string;
    feedback?: string;
    type?: "strength" | "improvement";
  }>;
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

export type RoleplayRepository = {
  createSession(input: RoleplaySessionCreateInput): Promise<RoleplaySessionRecord>;
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findSessionById(sessionId: string): Promise<RoleplaySessionRecord | null>;
  findSessionsByOrgId(orgId: string): Promise<RoleplaySessionRecord[]>;
  findSessionsByRepId(repId: string): Promise<RoleplaySessionRecord[]>;
  updateSession(
    sessionId: string,
    patch: Partial<{
      overallScore: number | null;
      scorecard: RoleplayScorecard | null;
      status: "active" | "evaluating" | "complete";
      transcript: RoleplayMessage[];
    }>,
  ): Promise<RoleplaySessionRecord>;
};

const PERSONAS: RoleplayPersona[] = [
  {
    id: "skeptical-cfo",
    name: "Dana Mercer",
    role: "CFO",
    company: "Apex Manufacturing",
    industry: "Manufacturing",
    difficulty: "advanced",
    objectionType: "ROI & Budget",
    description:
      "Numbers-first CFO who demands hard ROI, challenges assumptions, and pushes back on vague claims.",
    avatarInitials: "DM",
  },
  {
    id: "busy-ops-director",
    name: "Marcus Webb",
    role: "Director of Operations",
    company: "FastTrack Logistics",
    industry: "Logistics",
    difficulty: "intermediate",
    objectionType: "Time & Bandwidth",
    description:
      "Time-starved operations leader who cares about implementation load and wants a sharp, practical conversation.",
    avatarInitials: "MW",
  },
  {
    id: "stalling-vp",
    name: "Priya Sharma",
    role: "VP of Sales",
    company: "GrowthPath SaaS",
    industry: "SaaS",
    difficulty: "intermediate",
    objectionType: "Indecision & Stalling",
    description:
      "Interested sales leader who sees the value but delays decisions until a rep creates a concrete next step.",
    avatarInitials: "PS",
  },
  {
    id: "price-sensitive-smb",
    name: "Kevin Torres",
    role: "Owner",
    company: "Torres & Co.",
    industry: "Professional Services",
    difficulty: "beginner",
    objectionType: "Price Sensitivity",
    description:
      "Friendly SMB owner who watches every dollar, compares against cheaper options, and values simplicity.",
    avatarInitials: "KT",
  },
  {
    id: "technical-buyer",
    name: "Alex Chen",
    role: "Head of Engineering",
    company: "DataStream AI",
    industry: "AI / Data",
    difficulty: "advanced",
    objectionType: "Technical Scrutiny",
    description:
      "Deep technical evaluator who probes architecture, security, integrations, and proof-of-concept requirements.",
    avatarInitials: "AC",
  },
];

const PERSONA_OPENERS: Record<string, string> = {
  "skeptical-cfo": "Before we go too far, show me the ROI math.",
  "busy-ops-director": "I've got about fifteen minutes, so tell me why this doesn't create more work for my team.",
  "stalling-vp": "Timing is tough right now, so tell me why this matters now.",
  "price-sensitive-smb":
    "Thanks for making time. We're watching spend carefully this quarter, so keep it straightforward for me.",
  "technical-buyer":
    "Before I evaluate this seriously, I need to understand how your architecture, security, and integrations hold up.",
};

function serializeSession(session: RoleplaySessionRecord): RoleplaySession {
  const personaDetails = session.persona ? getRoleplayPersona(session.persona) : null;
  return {
    id: session.id,
    repId: session.repId,
    orgId: session.orgId,
    persona: session.persona,
    personaDetails,
    industry: session.industry,
    difficulty: session.difficulty,
    overallScore: session.overallScore,
    origin: session.origin ?? "manual",
    sourceCallId: session.sourceCallId ?? null,
    rubricId: session.rubricId ?? null,
    focusMode: session.focusMode ?? "all",
    focusCategorySlug: session.focusCategorySlug ?? null,
    scenarioSummary: session.scenarioSummary ?? null,
    scenarioBrief: session.scenarioBrief ?? null,
    transcript: Array.isArray(session.transcript) ? session.transcript : [],
    scorecard: normalizeScorecard(session.scorecard),
    status: session.status,
    createdAt: session.createdAt.toISOString(),
  };
}

function createEmptyCategoryScores(): Record<RoleplayCategory, number | null> {
  return {
    closing: null,
    discovery: null,
    frame_control: null,
    objection_handling: null,
    pain_expansion: null,
    rapport: null,
    solution: null,
  };
}

function normalizeScorecard(
  scorecard: RoleplayScorecard | LegacyRoleplayScorecard | null,
): RoleplayScorecard | null {
  if (!scorecard) {
    return null;
  }

  if ("confidence" in scorecard && "categoryScores" in scorecard && "callStageReached" in scorecard) {
    return scorecard;
  }

  const fallbackCategoryScores = createEmptyCategoryScores();
  fallbackCategoryScores.solution = 74;
  fallbackCategoryScores.discovery = 68;
  fallbackCategoryScores.closing = 71;

  return {
    callStageReached: "solution",
    categoryScores: fallbackCategoryScores,
    confidence: "medium",
    summary: scorecard.summary,
    strengths: scorecard.strengths,
    improvements: scorecard.improvements,
    recommendedDrills: scorecard.recommendedDrills,
    moments: scorecard.moments.map((moment) => ({
      category: "solution",
      severity: moment.type === "strength" ? "strength" : "improvement",
      observation: moment.title ?? "Coaching moment",
      recommendation:
        moment.feedback ?? "Anchor the conversation more tightly to pain, proof, and a clear next step.",
    })),
  };
}

function normalizeTranscript(transcript: RoleplayMessage[] | null | undefined): RoleplayMessage[] {
  return Array.isArray(transcript) ? transcript.filter((item) => item?.content && item?.role) : [];
}

function buildReply(persona: RoleplayPersona, userMessage: string): string {
  const message = userMessage.toLowerCase();

  switch (persona.id) {
    case "skeptical-cfo":
      if (/%|roi|payback|math|revenue|margin|time/.test(message)) {
        return "That is directionally useful, but I still need the ROI assumptions and payback window spelled out clearly.";
      }
      return "I am still missing the ROI case. What is the measurable financial impact and how quickly do we see it?";
    case "busy-ops-director":
      if (/implement|onboard|owner|team|week|day/.test(message)) {
        return "That helps, but be specific about who owns rollout and how much lift my team actually carries.";
      }
      return "I need the short version. What changes for my team next week if I say yes?";
    case "stalling-vp":
      if (/calendar|next step|tuesday|thursday|pilot|cro|review/.test(message)) {
        return "If we can keep it lightweight, I am open to holding that next step with my CRO.";
      }
      return "I like the direction, but I would still need a concrete next step before I move this internally.";
    case "technical-buyer":
      if (/api|security|soc 2|data|integration|architecture/.test(message)) {
        return "Good. Now tell me how the data moves, what your security posture looks like, and where the integration boundaries sit.";
      }
      return "I need more technical depth before I can take this seriously. How does it work under the hood?";
    case "price-sensitive-smb":
    default:
      if (/simple|month|pilot|small team|pricing|cost|budget/.test(message)) {
        return "I like keeping it simple, but I still need to know the minimum spend and whether this stays flexible for a team our size.";
      }
      return "That sounds useful, but I still need to understand what it costs and whether it is easy enough for a smaller team to adopt.";
  }
}

function buildScorecard(transcript: RoleplayMessage[]): {
  overallScore: number;
  scorecard: RoleplayScorecard;
} {
  const userLines = transcript
    .filter((item) => item.role === "user")
    .map((item) => item.content.toLowerCase());

  const hasNumericProof = userLines.some((line) => /%|\d/.test(line));
  const hasDiscovery = userLines.some((line) => /\?|pain|today|process|team|problem/.test(line));
  const hasNextStep = userLines.some((line) => /next step|calendar|pilot|review|tuesday|thursday|monday|friday/.test(line));
  const hasImplementation = userLines.some((line) => /implement|onboard|rollout|owner|week|timeline/.test(line));
  const hasTechnical = userLines.some((line) => /api|security|soc 2|integration|data|architecture/.test(line));

  let score = 58;
  if (hasNumericProof) score += 10;
  if (hasDiscovery) score += 8;
  if (hasNextStep) score += 14;
  if (hasImplementation) score += 6;
  if (hasTechnical) score += 6;
  if (userLines.length >= 2) score += 4;

  score = Math.max(42, Math.min(95, score));

  const strengths: string[] = [];
  const improvements: string[] = [];
  const recommendedDrills: string[] = [];
  const moments: RoleplayScorecard["moments"] = [];
  const categoryScores = createEmptyCategoryScores();

  categoryScores.frame_control = hasNextStep ? 84 : 66;
  categoryScores.rapport = hasDiscovery ? 76 : 63;
  categoryScores.discovery = hasDiscovery ? 83 : 57;
  categoryScores.pain_expansion = hasDiscovery ? 78 : 59;
  categoryScores.solution = hasNumericProof ? 87 : 67;
  categoryScores.objection_handling = hasTechnical || hasImplementation ? 81 : 64;
  categoryScores.closing = hasNextStep ? 92 : 54;

  const confidence: RoleplayScorecard["confidence"] =
    score >= 82 ? "high" : score >= 68 ? "medium" : "low";
  const callStageReached: RoleplayScorecard["callStageReached"] = hasNextStep
    ? "commitment"
    : hasNumericProof
      ? "solution"
      : hasDiscovery
        ? "discovery"
        : "opening";

  if (hasNumericProof) {
    strengths.push("Used quantified business impact instead of generic value statements.");
    moments.push({
      category: "solution",
      observation: "The rep used concrete numbers to support the business case.",
      recommendation: "Keep tying quantified proof directly to the buyer's current pain and urgency.",
      severity: "strength",
    });
  } else {
    improvements.push("Bring a quantified ROI or outcome into the conversation earlier.");
    recommendedDrills.push("ROI storytelling under pressure");
    moments.push({
      category: "solution",
      observation: "The business case stayed mostly qualitative and left ROI assumptions unstated.",
      recommendation: "Add a sharper quantified proof point before asking for commitment.",
      severity: "improvement",
    });
  }

  if (hasNextStep) {
    strengths.push("Closed toward a specific next step instead of ending vaguely.");
    moments.push({
      category: "closing",
      observation: "The rep proposed a concrete follow-up with ownership and timing.",
      recommendation: "Keep preserving that calendar control when the buyer starts to stall.",
      severity: "strength",
    });
  } else {
    improvements.push("Create urgency and land a dated next step before ending the call.");
    recommendedDrills.push("Closing with calendar control");
    moments.push({
      category: "closing",
      observation: "The conversation ended without a committed next step or clear ownership.",
      recommendation: "Land a dated follow-up before ending the roleplay.",
      severity: "critical",
    });
  }

  if (hasDiscovery) {
    strengths.push("Connected the pitch to the buyer's operational pain.");
    moments.push({
      category: "discovery",
      observation: "The rep tied the pitch back to the buyer's current pain and workflow constraints.",
      recommendation: "Keep opening with buyer context before moving into proof.",
      severity: "strength",
    });
  } else {
    improvements.push("Ask deeper discovery questions before pitching solution details.");
    recommendedDrills.push("Pain discovery ladder");
    moments.push({
      category: "discovery",
      observation: "The rep moved into solution language before opening enough discovery.",
      recommendation: "Use one more diagnostic question before presenting the solution.",
      severity: "improvement",
    });
  }

  if (!hasImplementation) {
    recommendedDrills.push("Implementation objection handling");
    moments.push({
      category: "objection_handling",
      observation: "Implementation ownership and rollout lift were not addressed clearly enough.",
      recommendation: "Clarify rollout ownership and expected workload before the buyer asks twice.",
      severity: "improvement",
    });
  } else {
    strengths.push("Handled implementation questions with a more concrete rollout answer.");
  }

  if (recommendedDrills.length === 0) {
    recommendedDrills.push("Advanced objection handling");
  }

  return {
    overallScore: score,
    scorecard: {
      callStageReached,
      categoryScores,
      confidence,
      summary:
        score >= 80
          ? "Strong roleplay. The rep handled the conversation with clear proof and forward momentum."
          : "Solid foundation, but the rep still needs tighter proof points and a firmer close.",
      strengths,
      improvements,
      recommendedDrills: [...new Set(recommendedDrills)],
      moments,
    },
  };
}

async function getViewer(
  authUserId: string,
): Promise<ServiceResult<AccessContext>> {
  const { createAccessRepository } = await import("@/lib/access/create-repository");
  const accessRepository = createAccessRepository();
  const actor = await accessRepository.findActorByAuthUserId(authUserId);

  if (!actor) {
    return {
      ok: false,
      status: 404,
      error: "User is not provisioned in the app database",
    };
  }

  if (!actor.orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  const [memberships, grants] = await Promise.all([
    accessRepository.findMembershipsByOrgId(actor.orgId),
    accessRepository.findGrantsByUserId(actor.id, actor.orgId),
  ]);

  return {
    ok: true,
    data: buildAccessContext({
      actor,
      memberships,
      grants,
    }),
  };
}

async function getAuthorizedSession(
  repository: RoleplayRepository,
  authUserId: string,
  sessionId: string,
): Promise<ServiceResult<RoleplaySessionRecord>> {
  const accessResult = await getViewer(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const session = await repository.findSessionById(sessionId);

  if (!session) {
    return {
      ok: false,
      status: 404,
      error: "Roleplay session not found",
    };
  }

  if (!canActorViewRep(accessResult.data, session.repId)) {
    return {
      ok: false,
      status: 403,
      error: "You do not have access to this roleplay session",
    };
  }

  return { ok: true, data: session };
}

function getAllRepIds(access: AccessContext) {
  const repIds = new Set<string>();

  for (const ids of access.repIdsByTeamId.values()) {
    for (const repId of ids) {
      repIds.add(repId);
    }
  }

  repIds.add(access.actor.id);

  return repIds;
}

function getVisibleRepIds(access: AccessContext) {
  const visibleRepIds = new Set<string>();

  for (const repId of getAllRepIds(access)) {
    if (canActorViewRep(access, repId)) {
      visibleRepIds.add(repId);
    }
  }

  return visibleRepIds;
}

export function getRoleplayPersonas() {
  return PERSONAS;
}

export function getRoleplayPersona(personaId: string) {
  return PERSONAS.find((persona) => persona.id === personaId) ?? null;
}

export async function listRoleplaySessions(
  repository: RoleplayRepository,
  authUserId: string,
): Promise<ServiceResult<{ personas: RoleplayPersona[]; sessions: RoleplaySession[] }>> {
  const accessResult = await getViewer(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  if (access.actor.role === "admin" || access.actor.role === "executive") {
    const orgId = access.actor.orgId;

    if (!orgId) {
      return {
        ok: false,
        status: 403,
        error: "User must belong to an organization",
      };
    }

    const sessions = await repository.findSessionsByOrgId(orgId);

    return {
      ok: true,
      data: {
        personas: getRoleplayPersonas(),
        sessions: sessions.map(serializeSession),
      },
    };
  }

  const visibleRepIds = getVisibleRepIds(access);

  if (visibleRepIds.size === 0) {
    return {
      ok: false,
      status: 403,
      error: "You do not have access to any roleplay sessions",
    };
  }

  const sessions = (
    await Promise.all([...visibleRepIds].map((repId) => repository.findSessionsByRepId(repId)))
  ).flat();

  return {
    ok: true,
    data: {
      personas: PERSONAS,
      sessions: sessions.map(serializeSession),
    },
  };
}

export async function getRoleplaySession(
  repository: RoleplayRepository,
  authUserId: string,
  sessionId: string,
): Promise<ServiceResult<RoleplaySession>> {
  const sessionResult = await getAuthorizedSession(repository, authUserId, sessionId);

  if (!sessionResult.ok) {
    return sessionResult;
  }

  return {
    ok: true,
    data: serializeSession(sessionResult.data),
  };
}

export async function createRoleplaySession(
  repository: RoleplayRepository,
  authUserId: string,
  personaId: string,
): Promise<ServiceResult<RoleplaySession>> {
  const accessResult = await getViewer(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const orgId = accessResult.data.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  const persona = getRoleplayPersona(personaId);

  if (!persona) {
    return {
      ok: false,
      status: 404,
      error: "Roleplay persona not found",
    };
  }

  const transcript: RoleplayMessage[] = [
    {
      role: "assistant",
      content: PERSONA_OPENERS[persona.id] ?? "Tell me what this does and why it matters now.",
    },
  ];

  const session = await repository.createSession(normalizeRoleplaySessionCreateInput({
    difficulty: persona.difficulty,
    industry: persona.industry,
    orgId,
    persona: persona.id,
    origin: "manual",
    sourceCallId: null,
    rubricId: null,
    focusMode: "all",
    focusCategorySlug: null,
    scenarioSummary: null,
    scenarioBrief: null,
    repId: accessResult.data.actor.id,
    scorecard: null,
    status: "active",
    transcript,
  }) as RoleplaySessionCreateInput);

  return {
    ok: true,
    data: serializeSession(session),
  };
}

export async function appendRoleplayMessage(
  repository: RoleplayRepository,
  authUserId: string,
  sessionId: string,
  input: { content: string },
): Promise<ServiceResult<RoleplaySession>> {
  const sessionResult = await getAuthorizedSession(repository, authUserId, sessionId);

  if (!sessionResult.ok) {
    return sessionResult;
  }

  const trimmed = input.content.trim();

  if (!trimmed) {
    return {
      ok: false,
      status: 400,
      error: "Message content is required",
    };
  }

  if (sessionResult.data.status !== "active") {
    return {
      ok: false,
      status: 409,
      error: "Roleplay session is already complete",
    };
  }

  const persona = sessionResult.data.persona
    ? getRoleplayPersona(sessionResult.data.persona)
    : null;

  const transcript = normalizeTranscript(sessionResult.data.transcript);
  const nextTranscript: RoleplayMessage[] = [
    ...transcript,
    { role: "user", content: trimmed },
    {
      role: "assistant",
      content: buildReply(
        persona ?? PERSONAS[0],
        trimmed,
      ),
    },
  ];

  const updated = await repository.updateSession(sessionId, {
    status: "active",
    transcript: nextTranscript,
  });

  return {
    ok: true,
    data: serializeSession(updated),
  };
}

export async function completeRoleplaySession(
  repository: RoleplayRepository,
  authUserId: string,
  sessionId: string,
): Promise<ServiceResult<RoleplaySession>> {
  const sessionResult = await getAuthorizedSession(repository, authUserId, sessionId);

  if (!sessionResult.ok) {
    return sessionResult;
  }

  const transcript = normalizeTranscript(sessionResult.data.transcript);

  if (transcript.length < 2) {
    return {
      ok: false,
      status: 409,
      error: "Roleplay session needs more conversation before it can be scored",
    };
  }

  const { overallScore, scorecard } = buildScorecard(transcript);

  const updated = await repository.updateSession(sessionId, {
    overallScore,
    scorecard,
    status: "complete",
  });

  return {
    ok: true,
    data: serializeSession(updated),
  };
}
