import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { generateTrainingModules, normalizeTrainingModuleGenerationInput } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "topic, targetRole, skillFocus, and moduleCount are required" }, { status: 400 });
  }

  const normalized = normalizeTrainingModuleGenerationInput(body);

  if (!normalized.ok) {
    return Response.json({ error: normalized.error }, { status: 400 });
  }

  return fromServiceResult(await generateTrainingModules(authUser.id, normalized.data));
}
