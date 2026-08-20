import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { createAnnotation, listAnnotations } from "@/lib/calls/service";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("call_scoring");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id } = await params;
  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await listAnnotations(repository, authUser.id, id);
  return fromServiceResult(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("call_scoring");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const body = (await request.json()) as { note?: unknown; timestampSeconds?: unknown };

  if (typeof body.note !== "string") {
    return Response.json({ error: "note is required" }, { status: 400 });
  }

  if (
    body.timestampSeconds !== undefined &&
    body.timestampSeconds !== null &&
    typeof body.timestampSeconds !== "number"
  ) {
    return Response.json({ error: "timestampSeconds must be a number" }, { status: 400 });
  }

  const { id } = await params;
  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await createAnnotation(repository, authUser.id, id, {
    note: body.note,
    timestampSeconds: typeof body.timestampSeconds === "number" ? body.timestampSeconds : null,
  });

  return fromServiceResult(result);
}
