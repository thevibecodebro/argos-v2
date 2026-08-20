import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { fromServiceResult } from "@/lib/http";
import { createTrainingRepository } from "@/lib/training/create-repository";
import {
  generateTrainingModuleDraft,
  normalizeTrainingModuleDraftGenerationInput,
} from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    return Response.json({ error: "mode and contextNotes are required" }, { status: 400 });
  }

  const normalized = normalizeTrainingModuleDraftGenerationInput(body);
  if (!normalized.ok) {
    return Response.json({ error: normalized.error }, { status: 400 });
  }

  const { id } = await params;
  const result = await generateTrainingModuleDraft(
    createTrainingRepository(),
    authUser.id,
    id,
    normalized.data,
  );

  return fromServiceResult(result);
}
