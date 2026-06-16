import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { submitTrainingProgress } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const body = (await request.json()) as { quizAnswers?: unknown };

  if (
    body.quizAnswers !== undefined &&
    !(
      Array.isArray(body.quizAnswers) &&
      body.quizAnswers.every((value) => typeof value === "number")
    )
  ) {
    return Response.json({ error: "quizAnswers must be an array of numbers" }, { status: 400 });
  }

  const { id } = await params;
  const repository = await createEffectiveTenantRepository(createTrainingRepository(), authUser.id);
  const result = await submitTrainingProgress(
    repository,
    authUser.id,
    id,
    Array.isArray(body.quizAnswers) ? body.quizAnswers : undefined,
  );

  return fromServiceResult(result);
}
