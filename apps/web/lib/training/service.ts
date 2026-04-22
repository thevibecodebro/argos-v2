import { createAccessRepository } from "@/lib/access/create-repository";
import type { TeamPermissionKey } from "@/lib/access/permissions";
import {
  buildAccessContext,
  canActorUsePermissionForRep,
  type AccessContext,
} from "@/lib/access/service";
import type { DashboardUserRecord } from "@/lib/dashboard/service";

export type TrainingModuleRecord = {
  id: string;
  orgId: string;
  title: string | null;
  skillCategory: string | null;
  videoUrl: string | null;
  description: string | null;
  quizData: {
    questions: Array<{ question: string; options: string[]; correctIndex: number }>;
  } | null;
  orderIndex: number | null;
  createdAt: Date;
};

export type TrainingProgressRecord = {
  id: string;
  repId: string;
  moduleId: string;
  status: "assigned" | "in_progress" | "passed" | "failed";
  score: number | null;
  attempts: number;
  completedAt: Date | null;
  assignedBy: string | null;
  assignedAt: Date | null;
  dueDate: Date | null;
};

export type TrainingModuleSummary = {
  id: string;
  orgId: string;
  title: string;
  skillCategory: string;
  videoUrl: string | null;
  description: string | null;
  hasQuiz: boolean;
  quizData: TrainingModuleRecord["quizData"];
  orderIndex: number;
  createdAt: string;
  progress: {
    status: string;
    score: number | null;
    attempts: number;
    completedAt: string | null;
    dueDate: string | null;
    assignedAt: string | null;
  } | null;
};

export type TrainingTeamProgress = {
  repId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  assigned: number;
  passed: number;
  completionRate: number;
};

export type TrainingProgressModuleSummary = {
  id: string;
  title: string;
};

export type TrainingRepModuleProgress = {
  moduleId: string;
  moduleTitle: string;
  status: string;
  score: number | null;
  attempts: number;
  assignedAt: string | null;
  dueDate: string | null;
};

export type TrainingRepProgress = {
  repId: string;
  firstName: string | null;
  lastName: string | null;
  moduleProgress: TrainingRepModuleProgress[];
};

export type TrainingTeamProgressShell = {
  modules: TrainingProgressModuleSummary[];
  repProgress: TrainingRepProgress[];
};

export type TrainingModuleUpsertInput = {
  title: string;
  description: string;
  skillCategory: string;
  videoUrl: string | null;
  quizData: TrainingModuleRecord["quizData"];
};

export type TrainingModuleAssignmentInput = {
  repIds: string[];
  dueDate: string | null;
};

export type TrainingModuleAssignmentRejection = {
  repId: string;
  reason: "out_of_scope" | "not_found";
};

export type TrainingModuleAssignmentResult = {
  assignedRepIds: string[];
  rejectedRepIds: TrainingModuleAssignmentRejection[];
};

export type TrainingAiStatus = {
  available: boolean;
  reason: string | null;
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 403 | 404 | 409 | 422 | 501; error: string };

export type TrainingModuleGenerationInput = {
  topic: string;
  targetRole: string;
  moduleCount: number;
  skillFocus: string;
};

export type TrainingModuleDraftGenerationInput = {
  mode: "content" | "quiz";
  contextNotes: string;
};

const MAX_GENERATION_FIELD_LENGTH = 120;
const MAX_GENERATION_MODULE_COUNT = 6;

export function normalizeTrainingModuleGenerationInput(
  input: unknown,
):
  | { ok: true; data: TrainingModuleGenerationInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      error: "topic, targetRole, skillFocus, and moduleCount are required",
    };
  }

  const candidate = input as Record<string, unknown>;
  const topic = typeof candidate.topic === "string" ? candidate.topic.trim() : "";
  const targetRole = typeof candidate.targetRole === "string" ? candidate.targetRole.trim() : "";
  const skillFocus = typeof candidate.skillFocus === "string" ? candidate.skillFocus.trim() : "";
  const moduleCount = typeof candidate.moduleCount === "number" ? candidate.moduleCount : Number.NaN;

  if (!topic || !targetRole || !skillFocus) {
    return {
      ok: false,
      error: "topic, targetRole, skillFocus, and moduleCount are required",
    };
  }

  if (
    topic.length > MAX_GENERATION_FIELD_LENGTH ||
    targetRole.length > MAX_GENERATION_FIELD_LENGTH ||
    skillFocus.length > MAX_GENERATION_FIELD_LENGTH
  ) {
    return {
      ok: false,
      error: `topic, targetRole, and skillFocus must be 1-${MAX_GENERATION_FIELD_LENGTH} characters each`,
    };
  }

  if (!Number.isInteger(moduleCount) || moduleCount < 1 || moduleCount > MAX_GENERATION_MODULE_COUNT) {
    return {
      ok: false,
      error: `moduleCount must be between 1 and ${MAX_GENERATION_MODULE_COUNT}`,
    };
  }

  return {
    ok: true,
    data: {
      topic,
      targetRole,
      skillFocus,
      moduleCount,
    },
  };
}

export function normalizeTrainingModuleDraftGenerationInput(
  input: unknown,
):
  | { ok: true; data: TrainingModuleDraftGenerationInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      error: "mode and contextNotes are required",
    };
  }

  const candidate = input as Record<string, unknown>;
  if (candidate.mode !== "content" && candidate.mode !== "quiz") {
    return {
      ok: false,
      error: "mode must be content or quiz",
    };
  }

  if (typeof candidate.contextNotes !== "string") {
    return {
      ok: false,
      error: "contextNotes must be a string",
    };
  }

  return {
    ok: true,
    data: {
      mode: candidate.mode,
      contextNotes: candidate.contextNotes.trim(),
    },
  };
}

type TrainingGeneratedModule = {
  title: string;
  skillCategory: string;
  description: string;
  quizData: TrainingModuleRecord["quizData"];
};

type TrainingModuleContentDraft = {
  title: string;
  skillCategory: string;
  description: string;
  videoUrl: string | null;
};

type TrainingModuleDraftResult =
  | { mode: "content"; draft: TrainingModuleContentDraft }
  | { mode: "quiz"; draft: { quizData: TrainingModuleRecord["quizData"] } };

export type TrainingRepository = {
  countModulesByOrgId(orgId: string): Promise<number>;
  createModules(
    modules: Array<{
      orgId: string;
      title: string;
      description: string;
      skillCategory: string;
      videoUrl: string | null;
      quizData: TrainingModuleRecord["quizData"];
      orderIndex: number;
    }>,
  ): Promise<void>;
  createModule: (
    input: {
      orgId: string;
      title: string;
      description: string;
      skillCategory: string;
      videoUrl: string | null;
      quizData: TrainingModuleRecord["quizData"];
      orderIndex: number;
    },
  ) => Promise<TrainingModuleRecord>;
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findModuleById: (moduleId: string) => Promise<TrainingModuleRecord | null>;
  findModulesByOrgId(orgId: string): Promise<TrainingModuleRecord[]>;
  findProgressByModuleId: (moduleId: string) => Promise<TrainingProgressRecord[]>;
  findProgressByRepId(repId: string): Promise<TrainingProgressRecord[]>;
  findRepIdsByOrgId(orgId: string): Promise<string[]>;
  findTeamProgressByOrgId(orgId: string): Promise<TrainingTeamProgress[]>;
  updateModule: (
    moduleId: string,
    input: {
      title: string;
      description: string;
      skillCategory: string;
      videoUrl: string | null;
      quizData: TrainingModuleRecord["quizData"];
    },
  ) => Promise<TrainingModuleRecord>;
  assignModuleToRepIds: (input: {
    moduleId: string;
    repIds: string[];
    assignedBy: string;
    dueDate: Date | null;
  }) => Promise<void>;
  removeModuleAssignmentsForRepIds: (input: {
    moduleId: string;
    repIds: string[];
  }) => Promise<void>;
  upsertProgress(input: {
    moduleId: string;
    repId: string;
    score: number | null;
    status: "assigned" | "in_progress" | "passed" | "failed";
  }): Promise<TrainingProgressRecord>;
};

const STARTER_MODULES = [
  {
    title: "Discovery That Finds the Real Pain",
    skillCategory: "Discovery",
    description: "Learn how to move past surface-level symptoms and uncover the operational pain behind the deal. This module gives reps a repeatable question ladder for discovery calls.",
    quizData: {
      questions: [
        {
          question: "What is the strongest reason to ask layered follow-up questions in discovery?",
          options: [
            "To keep the talk track moving quickly",
            "To uncover root causes behind the stated problem",
            "To avoid discussing budget",
            "To shorten the sales cycle automatically",
          ],
          correctIndex: 1,
        },
        {
          question: "Which phrasing best deepens the pain conversation?",
          options: [
            "Can you send me your org chart?",
            "How often does that problem show up today?",
            "Do you prefer monthly billing?",
            "Who approves legal review?",
          ],
          correctIndex: 1,
        },
        {
          question: "What should happen before you present the solution?",
          options: [
            "You should have clear impact and urgency from the buyer",
            "You should quote pricing immediately",
            "You should skip stakeholder questions",
            "You should promise implementation in a week",
          ],
          correctIndex: 0,
        },
      ],
    },
  },
  {
    title: "Objection Handling Without Losing Control",
    skillCategory: "Objection Handling",
    description: "Practice receiving objections without becoming defensive. Reps learn how to validate the concern, isolate the objection, and move toward a next step.",
    quizData: {
      questions: [
        {
          question: "What is the best first move when a buyer objects on price?",
          options: [
            "Discount immediately",
            "Challenge them on budget authority",
            "Acknowledge the concern and clarify what feels expensive",
            "End the meeting and send a proposal",
          ],
          correctIndex: 2,
        },
        {
          question: "Why isolate the objection?",
          options: [
            "To see whether other blockers still remain",
            "To avoid discovery work",
            "To shorten the contract",
            "To skip stakeholder alignment",
          ],
          correctIndex: 0,
        },
        {
          question: "Which response maintains control best?",
          options: [
            "We are definitely cheaper than everyone else",
            "If price were solved, would anything else block moving forward?",
            "Let me circle back next quarter",
            "That is just how enterprise software works",
          ],
          correctIndex: 1,
        },
      ],
    },
  },
  {
    title: "Closing With a Committed Next Step",
    skillCategory: "Closing",
    description: "This module trains reps to close meetings into a real next step instead of vague follow-up. It focuses on specificity, timeline pressure, and mutual commitment.",
    quizData: {
      questions: [
        {
          question: "What makes a next step effective?",
          options: [
            "It is specific, dated, and owned by both sides",
            "It is open-ended to reduce pressure",
            "It avoids naming stakeholders",
            "It is optional for the buyer",
          ],
          correctIndex: 0,
        },
        {
          question: "What is the risk of ending with 'I’ll follow up next week'?",
          options: [
            "The buyer may forget the meeting date",
            "It creates ambiguity and reduces commitment",
            "It lowers your quota capacity instantly",
            "It breaks procurement",
          ],
          correctIndex: 1,
        },
        {
          question: "Which line sounds most like a strong close?",
          options: [
            "I’ll send something over when I can",
            "Let’s hold 30 minutes Thursday with your CRO so we can validate rollout",
            "We should stay in touch",
            "Maybe revisit this later in the year",
          ],
          correctIndex: 1,
        },
      ],
    },
  },
];

const starterModuleSeedPromises = new Map<string, Promise<void>>();

function serializeProgress(progress: TrainingProgressRecord | undefined | null) {
  if (!progress) {
    return null;
  }

  return {
    status: progress.status,
    score: progress.score,
    attempts: progress.attempts,
    completedAt: progress.completedAt?.toISOString() ?? null,
    dueDate: progress.dueDate?.toISOString() ?? null,
    assignedAt: progress.assignedAt?.toISOString() ?? null,
  };
}

async function getAccessContext(authUserId: string): Promise<ServiceResult<AccessContext>> {
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

function getAllRepIds(access: AccessContext) {
  const repIds = new Set<string>();

  for (const ids of access.repIdsByTeamId.values()) {
    for (const repId of ids) {
      repIds.add(repId);
    }
  }

  return repIds;
}

function getAccessibleRepIds(access: AccessContext, permissionKeys: TeamPermissionKey[]) {
  if (access.actor.role === "admin" || access.actor.role === "executive") {
    return getAllRepIds(access);
  }

  const repIds = new Set<string>();
  for (const permissionKey of permissionKeys) {
    for (const repId of getAllRepIds(access)) {
      if (canActorUsePermissionForRep(access, permissionKey, repId)) {
        repIds.add(repId);
      }
    }
  }

  return repIds;
}

function hasManagerTrainingGrant(access: AccessContext) {
  if (access.actor.role === "admin") {
    return true;
  }

  if (access.actor.role !== "manager") {
    return false;
  }

  return (access.grantedTeamIdsByPermission.get("manage_team_training")?.size ?? 0) > 0;
}

function getManagedRepIds(access: AccessContext) {
  if (access.actor.role === "admin") {
    return getAllRepIds(access);
  }

  return getAccessibleRepIds(access, ["manage_team_training"]);
}

function canManageTrainingModule(access: AccessContext) {
  return hasManagerTrainingGrant(access);
}

function hasTrainingAccess(access: AccessContext) {
  if (access.actor.role === "admin" || access.actor.role === "executive" || access.actor.role === "rep") {
    return true;
  }

  return getAccessibleRepIds(access, ["view_team_training", "manage_team_training"]).size > 0;
}

async function ensureStarterModules(repository: TrainingRepository, orgId: string) {
  const existingPromise = starterModuleSeedPromises.get(orgId);
  if (existingPromise) {
    await existingPromise;
    return;
  }

  const seedPromise = (async () => {
    const existingCount = await repository.countModulesByOrgId(orgId);

    if (existingCount > 0) {
      return;
    }

    await repository.createModules(
      STARTER_MODULES.map((module, index) => ({
        orgId,
        title: module.title,
        description: module.description,
        skillCategory: module.skillCategory,
        videoUrl: null,
        quizData: module.quizData,
        orderIndex: index + 1,
      })),
    );
  })();

  starterModuleSeedPromises.set(orgId, seedPromise);

  try {
    await seedPromise;
  } finally {
    if (starterModuleSeedPromises.get(orgId) === seedPromise) {
      starterModuleSeedPromises.delete(orgId);
    }
  }
}

function isQuizData(value: unknown): value is TrainingModuleRecord["quizData"] {
  if (value === null) {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as { questions?: unknown };
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    return false;
  }

  return payload.questions.every((question) => {
    if (!question || typeof question !== "object") {
      return false;
    }

    const entry = question as {
      question?: unknown;
      options?: unknown;
      correctIndex?: unknown;
    };

    return (
      typeof entry.question === "string" &&
      entry.question.trim().length > 0 &&
      Array.isArray(entry.options) &&
      entry.options.length > 0 &&
      entry.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
      typeof entry.correctIndex === "number" &&
      Number.isInteger(entry.correctIndex) &&
      entry.correctIndex >= 0 &&
      entry.correctIndex < entry.options.length
    );
  });
}

function parseGeneratedModulesContent(
  content: string,
  moduleCount: number,
): TrainingGeneratedModule[] {
  const payload = JSON.parse(content) as { modules?: unknown };

  if (!Array.isArray(payload.modules) || payload.modules.length === 0) {
    throw new Error("AI response did not include modules");
  }

  return payload.modules.slice(0, moduleCount).map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("AI returned an invalid module shape");
    }

    const module = entry as {
      title?: unknown;
      skillCategory?: unknown;
      description?: unknown;
      quizData?: unknown;
    };
    const title = typeof module.title === "string" ? module.title.trim() : "";
    const skillCategory = typeof module.skillCategory === "string" ? module.skillCategory.trim() : "";
    const description = typeof module.description === "string" ? module.description.trim() : "";
    const quizData = module.quizData === undefined ? null : module.quizData;

    if (!title || !skillCategory || !description || !isQuizData(quizData)) {
      throw new Error("AI returned malformed training module content");
    }

    return {
      title,
      skillCategory,
      description,
      quizData,
    };
  });
}

function hasTrainingModuleContext(module: TrainingModuleRecord, contextNotes: string) {
  return Boolean(module.description?.trim() || module.videoUrl?.trim() || contextNotes.trim());
}

function buildTrainingModuleDraftPrompt(
  module: TrainingModuleRecord,
  input: TrainingModuleDraftGenerationInput,
) {
  const contextLines = [
    `Module title: ${module.title?.trim() || "(untitled module)"}`,
    `Skill category: ${module.skillCategory?.trim() || "(unspecified)"}`,
    `Description: ${module.description?.trim() || "(none)"}`,
    `Video URL: ${module.videoUrl?.trim() || "(none)"}`,
    `Context notes: ${input.contextNotes || "(none)"}`,
  ];

  if (input.mode === "quiz") {
    return [
      "You create grounded sales training quiz drafts.",
      'Return valid JSON only with shape {"draft":{"quizData":{"questions":[{"question":string,"options":[string,string,...],"correctIndex":number}]}}}.',
      "quizData must contain at least one question and every question must have at least 2 non-empty options.",
      "Use the attached module context and context notes to keep the quiz grounded in the lesson.",
      `Mode: ${input.mode}`,
      ...contextLines,
      "Create concise, practical questions that directly reflect the lesson material.",
    ].join("\n");
  }

  return [
    "You create grounded sales training lesson drafts.",
    'Return valid JSON only with shape {"draft":{"title":string,"skillCategory":string,"description":string,"videoUrl":string|null}}.',
    "Use the attached module context and context notes to keep the draft grounded in the lesson.",
    `Mode: ${input.mode}`,
    ...contextLines,
    "Draft concise lesson content that is practical and directly tied to the attached context.",
  ].join("\n");
}

function parseTrainingModuleDraftContent(
  content: string,
  mode: TrainingModuleDraftGenerationInput["mode"],
): TrainingModuleDraftResult {
  const payload = JSON.parse(content) as { draft?: unknown };

  if (!payload.draft || typeof payload.draft !== "object") {
    throw new Error("AI module draft response did not include a draft");
  }

  if (mode === "quiz") {
    const draft = payload.draft as {
      quizData?: unknown;
    };

    const quizData = draft.quizData === undefined ? null : draft.quizData;
    const hasMinimumOptions =
      quizData !== null &&
      isQuizData(quizData) &&
      quizData.questions.every((question) => question.options.length >= 2);

    if (!hasMinimumOptions) {
      throw new Error("AI returned malformed quiz draft content");
    }

    return {
      mode,
      draft: {
        quizData,
      },
    };
  }

  const draft = payload.draft as {
    title?: unknown;
    skillCategory?: unknown;
    description?: unknown;
    videoUrl?: unknown;
  };

  const title = typeof draft.title === "string" ? draft.title.trim() : "";
  const skillCategory = typeof draft.skillCategory === "string" ? draft.skillCategory.trim() : "";
  const description = typeof draft.description === "string" ? draft.description.trim() : "";
  const videoUrl =
    typeof draft.videoUrl === "string" && draft.videoUrl.trim().length > 0 ? draft.videoUrl.trim() : null;

  if (!title || !skillCategory || !description) {
    throw new Error("AI returned malformed lesson draft content");
  }

  return {
    mode,
    draft: {
      title,
      skillCategory,
      description,
      videoUrl,
    },
  };
}

export async function generateTrainingModuleDraft(
  repository: TrainingRepository,
  authUserId: string,
  moduleId: string,
  input: TrainingModuleDraftGenerationInput,
): Promise<ServiceResult<TrainingModuleDraftResult>> {
  const normalized = normalizeTrainingModuleDraftGenerationInput(input);
  if (!normalized.ok) {
    return {
      ok: false,
      status: 422,
      error: normalized.error,
    };
  }

  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  const orgId = access.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  if (!canManageTrainingModule(access)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  const module = await repository.findModuleById(moduleId);
  if (!module || module.orgId !== orgId) {
    return {
      ok: false,
      status: 404,
      error: "Module not found",
    };
  }

  if (!hasTrainingModuleContext(module, normalized.data.contextNotes)) {
    return {
      ok: false,
      status: 422,
      error:
        normalized.data.mode === "quiz"
          ? "Add course context before generating quiz content"
          : "Add course context before generating lesson content",
    };
  }

  const aiStatus = getTrainingAiStatus();
  if (!aiStatus.available) {
    return {
      ok: false,
      status: 422,
      error: "AI curriculum generation is unavailable until OpenAI is configured",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildTrainingModuleDraftPrompt(module, normalized.data),
          },
          {
            role: "user",
            content: [
              `Module ID: ${module.id}`,
              `Module title: ${module.title?.trim() || "(untitled module)"}`,
              `Skill category: ${module.skillCategory?.trim() || "(unspecified)"}`,
              `Mode: ${normalized.data.mode}`,
              normalized.data.contextNotes ? `Context notes: ${normalized.data.contextNotes}` : "Context notes: (none)",
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return {
        ok: false,
        status: 501,
        error: `AI module draft generation failed: ${response.status}${errorBody ? ` ${errorBody}` : ""}`,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return {
        ok: false,
        status: 501,
        error: "AI module draft generation returned an empty response",
      };
    }

    return {
      ok: true,
      data: parseTrainingModuleDraftContent(content, normalized.data.mode),
    };
  } catch (error) {
    return {
      ok: false,
      status: 501,
      error: error instanceof Error ? error.message : "AI module draft generation failed",
    };
  }
}

export async function getTrainingModules(
  repository: TrainingRepository,
  authUserId: string,
): Promise<ServiceResult<{ modules: TrainingModuleSummary[]; canManage: boolean }>> {
  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  const orgId = access.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  if (!hasTrainingAccess(access)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  await ensureStarterModules(repository, orgId);

  const [modules, progress] = await Promise.all([
    repository.findModulesByOrgId(orgId),
    repository.findProgressByRepId(access.actor.id),
  ]);

  const progressByModuleId = new Map(progress.map((entry) => [entry.moduleId, entry]));

  return {
    ok: true,
    data: {
      modules: modules.map((module) => ({
        id: module.id,
        orgId: module.orgId,
        title: module.title ?? "",
        skillCategory: module.skillCategory ?? "",
        videoUrl: module.videoUrl,
        description: module.description,
        hasQuiz: !!module.quizData,
        quizData: module.quizData,
        orderIndex: module.orderIndex ?? 0,
        createdAt: module.createdAt.toISOString(),
        progress: serializeProgress(progressByModuleId.get(module.id)),
      })),
      canManage: canManageTrainingModule(access),
    },
  };
}

export async function getTrainingTeamProgress(
  repository: TrainingRepository,
  authUserId: string,
): Promise<ServiceResult<{ rows: TrainingTeamProgress[]; progress: TrainingTeamProgressShell }>> {
  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  const orgId = access.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  if (access.actor.role === "rep" || !hasTrainingAccess(access)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  await ensureStarterModules(repository, orgId);

  const [rows, modules] = await Promise.all([
    repository.findTeamProgressByOrgId(orgId),
    repository.findModulesByOrgId(orgId),
  ]);
  const accessibleRepIds =
    access.actor.role === "admin" || access.actor.role === "executive"
      ? new Set(await repository.findRepIdsByOrgId(orgId))
      : getAccessibleRepIds(access, ["view_team_training", "manage_team_training"]);
  const filteredRows = rows.filter((row) => accessibleRepIds.has(row.repId));
  const progressByModule = await Promise.all(
    modules.map(async (module) => ({
      module,
      progress: await repository.findProgressByModuleId(module.id),
    })),
  );

  return {
    ok: true,
    data: {
      rows: filteredRows,
      progress: {
        modules: modules.map((module) => ({
          id: module.id,
          title: module.title ?? "",
        })),
        repProgress: filteredRows.map((row) => ({
          repId: row.repId,
          firstName: row.firstName,
          lastName: row.lastName,
          moduleProgress: progressByModule.flatMap(({ module, progress }) => {
            const entry = progress.find((item) => item.repId === row.repId);

            if (!entry) {
              return [];
            }

            return [
              {
                moduleId: module.id,
                moduleTitle: module.title ?? "",
                status: entry.status,
                score: entry.score,
                attempts: entry.attempts,
                assignedAt: entry.assignedAt?.toISOString() ?? null,
                dueDate: entry.dueDate?.toISOString() ?? null,
              },
            ];
          }),
        })),
      },
    },
  };
}

export async function submitTrainingProgress(
  repository: TrainingRepository,
  authUserId: string,
  moduleId: string,
  quizAnswers?: number[],
): Promise<ServiceResult<{ status: string; score: number | null; attempts: number }>> {
  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  const orgId = access.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  if (access.actor.role !== "rep") {
    return {
      ok: false,
      status: 403,
      error: "Reps only",
    };
  }

  await ensureStarterModules(repository, orgId);
  const modules = await repository.findModulesByOrgId(orgId);
  const module = modules.find((entry) => entry.id === moduleId);

  if (!module) {
    return {
      ok: false,
      status: 404,
      error: "Module not found",
    };
  }

  let score: number | null = null;
  let status: "assigned" | "in_progress" | "passed" | "failed" = "in_progress";

  const questions = module.quizData?.questions ?? [];

  if (questions.length > 0 && quizAnswers && quizAnswers.length === questions.length) {
    const correct = questions.filter((question, index) => question.correctIndex === quizAnswers[index]).length;
    score = Math.round((correct / questions.length) * 100);
    status = score >= 70 ? "passed" : "failed";
  } else if (questions.length === 0) {
    score = 100;
    status = "passed";
  }

  const progress = await repository.upsertProgress({
    moduleId,
    repId: access.actor.id,
    score,
    status,
  });

  return {
    ok: true,
    data: {
      status: progress.status,
      score: progress.score,
      attempts: progress.attempts,
    },
  };
}

export async function createTrainingModule(
  repository: TrainingRepository,
  authUserId: string,
  input: TrainingModuleUpsertInput,
): Promise<ServiceResult<{ module: TrainingModuleSummary }>> {
  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  const orgId = access.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  if (!canManageTrainingModule(access)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  const orderIndex = (await repository.countModulesByOrgId(orgId)) + 1;
  const module = await repository.createModule({
    orgId,
    title: input.title,
    description: input.description,
    skillCategory: input.skillCategory,
    videoUrl: input.videoUrl,
    quizData: input.quizData,
    orderIndex,
  });

  return {
    ok: true,
    data: {
      module: {
        id: module.id,
        orgId: module.orgId,
        title: module.title ?? "",
        skillCategory: module.skillCategory ?? "",
        videoUrl: module.videoUrl,
        description: module.description,
        hasQuiz: !!module.quizData,
        quizData: module.quizData,
        orderIndex: module.orderIndex ?? 0,
        createdAt: module.createdAt.toISOString(),
        progress: null,
      },
    },
  };
}

export async function updateTrainingModule(
  repository: TrainingRepository,
  authUserId: string,
  moduleId: string,
  input: TrainingModuleUpsertInput,
): Promise<ServiceResult<{ module: TrainingModuleSummary }>> {
  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  const orgId = access.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  if (!canManageTrainingModule(access)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  const module = await repository.findModuleById(moduleId);
  if (!module || module.orgId !== orgId) {
    return {
      ok: false,
      status: 404,
      error: "Module not found",
    };
  }

  const updatedModule = await repository.updateModule(moduleId, {
    title: input.title,
    description: input.description,
    skillCategory: input.skillCategory,
    videoUrl: input.videoUrl,
    quizData: input.quizData,
  });

  return {
    ok: true,
    data: {
      module: {
        id: updatedModule.id,
        orgId: updatedModule.orgId,
        title: updatedModule.title ?? "",
        skillCategory: updatedModule.skillCategory ?? "",
        videoUrl: updatedModule.videoUrl,
        description: updatedModule.description,
        hasQuiz: !!updatedModule.quizData,
        quizData: updatedModule.quizData,
        orderIndex: updatedModule.orderIndex ?? 0,
        createdAt: updatedModule.createdAt.toISOString(),
        progress: null,
      },
    },
  };
}

export function getTrainingAiStatus(): TrainingAiStatus {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      available: false,
      reason: "OPENAI_API_KEY is missing",
    };
  }

  return {
    available: true,
    reason: null,
  };
}

export async function generateTrainingModules(
  authUserId: string,
  input: TrainingModuleGenerationInput,
): Promise<ServiceResult<{ modules: TrainingGeneratedModule[] }>> {
  const validation = normalizeTrainingModuleGenerationInput(input);
  if (!validation.ok) {
    return {
      ok: false,
      status: 422,
      error: validation.error,
    };
  }

  const normalizedInput = validation.data;

  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  if (!canManageTrainingModule(accessResult.data)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  const aiStatus = getTrainingAiStatus();
  if (!aiStatus.available) {
    return {
      ok: false,
      status: 422,
      error: "AI curriculum generation is unavailable until OpenAI is configured",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_TRAINING_MODEL?.trim() || "gpt-5-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You create sales training modules. Return valid JSON only with shape {\"modules\":[{title,skillCategory,description,quizData}]}. quizData must be null or {questions:[{question,options,correctIndex}]}.",
          },
          {
            role: "user",
            content: [
              `Topic: ${normalizedInput.topic}`,
              `Target role: ${normalizedInput.targetRole}`,
              `Skill focus: ${normalizedInput.skillFocus}`,
              `Module count: ${normalizedInput.moduleCount}`,
              "Make each module distinct, practical, and concise. Include at least one quiz question per module unless a module clearly should have no quiz.",
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return {
        ok: false,
        status: 501,
        error: `AI curriculum generation failed: ${response.status}${errorBody ? ` ${errorBody}` : ""}`,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
        };
      }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return {
        ok: false,
        status: 501,
        error: "AI curriculum generation returned an empty response",
      };
    }

    return {
      ok: true,
      data: {
        modules: parseGeneratedModulesContent(content, normalizedInput.moduleCount),
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 501,
      error: error instanceof Error ? error.message : "AI curriculum generation failed",
    };
  }
}

export async function assignTrainingModule(
  repository: TrainingRepository,
  authUserId: string,
  moduleId: string,
  input: TrainingModuleAssignmentInput,
): Promise<ServiceResult<TrainingModuleAssignmentResult>> {
  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  const orgId = access.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  if (!canManageTrainingModule(access)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  const module = await repository.findModuleById(moduleId);
  if (!module || module.orgId !== orgId) {
    return {
      ok: false,
      status: 404,
      error: "Module not found",
    };
  }

  const orgRepIds = new Set(await repository.findRepIdsByOrgId(orgId));
  const accessibleRepIds = getManagedRepIds(access);
  const assignedRepIds: string[] = [];
  const rejectedRepIds: TrainingModuleAssignmentRejection[] = [];

  for (const repId of input.repIds) {
    if (!orgRepIds.has(repId)) {
      rejectedRepIds.push({ repId, reason: "not_found" });
      continue;
    }

    if (!accessibleRepIds.has(repId)) {
      rejectedRepIds.push({ repId, reason: "out_of_scope" });
      continue;
    }

    if (!assignedRepIds.includes(repId)) {
      assignedRepIds.push(repId);
    }
  }

  await repository.assignModuleToRepIds({
    moduleId,
    repIds: assignedRepIds,
    assignedBy: access.actor.id,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
  });

  return {
    ok: true,
    data: {
      assignedRepIds,
      rejectedRepIds,
    },
  };
}

export async function unassignTrainingModule(
  repository: TrainingRepository,
  authUserId: string,
  moduleId: string,
  repId: string,
): Promise<ServiceResult<{ unassignedRepId: string }>> {
  const accessResult = await getAccessContext(authUserId);

  if (!accessResult.ok) {
    return accessResult;
  }

  const access = accessResult.data;
  const orgId = access.actor.orgId;

  if (!orgId) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  if (!canManageTrainingModule(access)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  const module = await repository.findModuleById(moduleId);
  if (!module || module.orgId !== orgId) {
    return {
      ok: false,
      status: 404,
      error: "Module not found",
    };
  }

  const managedRepIds = getManagedRepIds(access);
  if (!managedRepIds.has(repId)) {
    return {
      ok: false,
      status: 403,
      error: "Managers can only manage reps on their granted teams",
    };
  }

  const progress = await repository.findProgressByModuleId(moduleId);
  const targetProgress = progress.find((entry) => entry.repId === repId);

  if (!targetProgress) {
    return {
      ok: false,
      status: 404,
      error: "Progress not found",
    };
  }

  if (targetProgress.status !== "assigned") {
    return {
      ok: false,
      status: 409,
      error: "Training progress has already started",
    };
  }

  await repository.removeModuleAssignmentsForRepIds({
    moduleId,
    repIds: [repId],
  });

  return {
    ok: true,
    data: {
      unassignedRepId: repId,
    },
  };
}
