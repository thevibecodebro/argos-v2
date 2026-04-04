import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { unauthorizedJson } from "@/lib/http";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { getTrainingModules } from "@/lib/training/service";

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
