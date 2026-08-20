import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { fromServiceResult } from "@/lib/http";
import { generateTrainingModules, normalizeTrainingModuleGenerationInput } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("training");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

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
