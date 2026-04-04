import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type { AppUserRole } from "@/lib/users/roles";

type TrainingModuleRecord = {
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

type TrainingProgressRecord = {
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

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 403 | 404; error: string };

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
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findModulesByOrgId(orgId: string): Promise<TrainingModuleRecord[]>;
  findProgressByRepId(repId: string): Promise<TrainingProgressRecord[]>;
  findTeamProgressByOrgId(orgId: string): Promise<TrainingTeamProgress[]>;
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

function isManagerRole(role: AppUserRole | null) {
  return role === "admin" || role === "manager" || role === "executive";
}

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

async function getViewer(
  repository: TrainingRepository,
  authUserId: string,
): Promise<ServiceResult<DashboardUserRecord>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User is not provisioned in the app database",
    };
  }

  return { ok: true, data: viewer };
}

async function ensureStarterModules(repository: TrainingRepository, orgId: string) {
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
}

export async function getTrainingModules(
  repository: TrainingRepository,
  authUserId: string,
): Promise<ServiceResult<{ modules: TrainingModuleSummary[]; canManage: boolean }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  if (!viewer.org) {
    return {
      ok: false,
      status: 403,
      error: "User must belong to an organization",
    };
  }

  await ensureStarterModules(repository, viewer.org.id);

  const [modules, progress] = await Promise.all([
    repository.findModulesByOrgId(viewer.org.id),
    repository.findProgressByRepId(viewer.id),
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
      canManage: isManagerRole(viewer.role),
    },
  };
}

export async function getTrainingTeamProgress(
  repository: TrainingRepository,
  authUserId: string,
): Promise<ServiceResult<{ rows: TrainingTeamProgress[] }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  if (!viewer.org || !isManagerRole(viewer.role)) {
    return {
      ok: false,
      status: 403,
      error: "Managers only",
    };
  }

  const rows = await repository.findTeamProgressByOrgId(viewer.org.id);

  return { ok: true, data: { rows } };
}

export async function submitTrainingProgress(
  repository: TrainingRepository,
  authUserId: string,
  moduleId: string,
  quizAnswers?: number[],
): Promise<ServiceResult<{ status: string; score: number | null; attempts: number }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const viewer = viewerResult.data;

  if (!viewer.org || isManagerRole(viewer.role)) {
    return {
      ok: false,
      status: 403,
      error: "Reps only",
    };
  }

  await ensureStarterModules(repository, viewer.org.id);
  const modules = await repository.findModulesByOrgId(viewer.org.id);
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
    repId: viewer.id,
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
