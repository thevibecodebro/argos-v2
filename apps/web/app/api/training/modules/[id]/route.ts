import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createTrainingRepository } from "@/lib/training/create-repository";
import {
  getTrainingModules,
  updateTrainingModule,
  type TrainingModuleRecord,
} from "@/lib/training/service";

export const dynamic = "force-dynamic";

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

  if (typeof body.title !== "string" || typeof body.skillCategory !== "string") {
    return Response.json({ error: "title and skillCategory are required" }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateTrainingModule(createTrainingRepository(), authUser.id, id, {
    title: body.title.trim(),
    skillCategory: body.skillCategory.trim(),
    description: typeof body.description === "string" ? body.description.trim() : "",
    videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : null,
    quizData: body.quizData && typeof body.quizData === "object" ? (body.quizData as TrainingModuleRecord["quizData"]) : null,
  });

  return fromServiceResult(result);
}
