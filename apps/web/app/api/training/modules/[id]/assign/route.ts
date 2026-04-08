import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { assignTrainingModule } from "@/lib/training/service";

export const dynamic = "force-dynamic";

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.trim().length > 0);
}

export async function POST(
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

  if (!isNonEmptyStringArray(body.repIds)) {
    return Response.json({ error: "repIds must be non-empty strings" }, { status: 400 });
  }

  const { id } = await params;
  const result = await assignTrainingModule(createTrainingRepository(), authUser.id, id, {
    repIds: body.repIds.map((repId) => repId.trim()),
    dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
  });

  return fromServiceResult(result);
}
