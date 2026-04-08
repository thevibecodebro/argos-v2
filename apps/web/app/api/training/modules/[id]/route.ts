import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createTrainingRepository } from "@/lib/training/create-repository";
import {
  getTrainingModules,
  updateTrainingModule,
  type TrainingModuleRecord,
} from "@/lib/training/service";

export const dynamic = "force-dynamic";

function isQuizData(value: unknown): value is TrainingModuleRecord["quizData"] {
  if (value === null) {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as {
    questions?: unknown;
  };

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
      Number.isInteger(entry.correctIndex) &&
      entry.correctIndex >= 0 &&
      entry.correctIndex < entry.options.length
    );
  });
}

function parseModuleUpsertBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const skillCategory = typeof input.skillCategory === "string" ? input.skillCategory.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";

  if (!title || !skillCategory) {
    return null;
  }

  if (input.videoUrl !== undefined && input.videoUrl !== null && typeof input.videoUrl !== "string") {
    return null;
  }

  if (input.quizData !== undefined && input.quizData !== null && !isQuizData(input.quizData)) {
    return null;
  }

  return {
    title,
    skillCategory,
    description,
    videoUrl:
      typeof input.videoUrl === "string" && input.videoUrl.trim().length > 0
        ? input.videoUrl.trim()
        : null,
    quizData: input.quizData === undefined || input.quizData === null ? null : input.quizData,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id } = await params;
  const result = await getTrainingModules(createTrainingRepository(), authUser.id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const module = result.data.modules.find((entry) => entry.id === id);

  if (!module) {
    return Response.json({ error: "Module not found" }, { status: 404 });
  }

  return Response.json(module, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = parseModuleUpsertBody(body);
  if (!payload) {
    return Response.json({ error: "title and skillCategory are required" }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateTrainingModule(createTrainingRepository(), authUser.id, id, {
    title: payload.title,
    skillCategory: payload.skillCategory,
    description: payload.description,
    videoUrl: payload.videoUrl,
    quizData: payload.quizData,
  });

  return fromServiceResult(result);
}
