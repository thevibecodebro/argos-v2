import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { generateTrainingModules } from "@/lib/training/service";

export const dynamic = "force-dynamic";

function parseGenerateBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;
  const topic = typeof input.topic === "string" ? input.topic.trim() : "";
  const targetRole = typeof input.targetRole === "string" ? input.targetRole.trim() : "";
  const skillFocus = typeof input.skillFocus === "string" ? input.skillFocus.trim() : "";
  const moduleCount = input.moduleCount;

  if (!topic || !targetRole || !skillFocus) {
    return null;
  }

  if (typeof moduleCount !== "number" || !Number.isInteger(moduleCount) || moduleCount <= 0) {
    return null;
  }

  return {
    topic,
    targetRole,
    skillFocus,
    moduleCount,
  };
}

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

  const payload = parseGenerateBody(body);
  if (!payload) {
    return Response.json({ error: "topic, targetRole, skillFocus, and moduleCount are required" }, { status: 400 });
  }

  return fromServiceResult(await generateTrainingModules(authUser.id, payload));
}
