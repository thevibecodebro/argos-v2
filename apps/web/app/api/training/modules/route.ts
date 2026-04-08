import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { createTrainingModule, getTrainingModules, type TrainingModuleRecord } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await getTrainingModules(createTrainingRepository(), authUser.id);
  return fromServiceResult(result);
}

export async function POST(request: Request) {
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

  const result = await createTrainingModule(createTrainingRepository(), authUser.id, {
    title: body.title.trim(),
    skillCategory: body.skillCategory.trim(),
    description: typeof body.description === "string" ? body.description.trim() : "",
    videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : null,
    quizData: body.quizData && typeof body.quizData === "object" ? (body.quizData as TrainingModuleRecord["quizData"]) : null,
  });

  return fromServiceResult(result);
}
