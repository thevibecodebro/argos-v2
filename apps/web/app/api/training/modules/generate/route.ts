import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { getTrainingAiStatus } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  try {
    await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = getTrainingAiStatus();
  if (!status.available) {
    return fromServiceResult({
      ok: false,
      status: 422,
      error: "AI curriculum generation is unavailable until OpenAI is configured",
    });
  }

  return fromServiceResult({
    ok: false,
    status: 501,
    error: "AI curriculum generation is not implemented yet",
  });
}
