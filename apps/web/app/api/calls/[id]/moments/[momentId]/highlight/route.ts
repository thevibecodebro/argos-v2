import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { toggleMomentHighlight } from "@/lib/calls/service";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; momentId: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("highlights");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const body = (await request.json()) as { isHighlight?: unknown; highlightNote?: unknown };

  if (typeof body.isHighlight !== "boolean") {
    return Response.json({ error: "isHighlight must be a boolean" }, { status: 400 });
  }

  if (
    body.highlightNote !== undefined &&
    body.highlightNote !== null &&
    typeof body.highlightNote !== "string"
  ) {
    return Response.json({ error: "highlightNote must be a string" }, { status: 400 });
  }

  const { id, momentId } = await params;
  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await toggleMomentHighlight(repository, authUser.id, id, momentId, {
    isHighlight: body.isHighlight,
    highlightNote: typeof body.highlightNote === "string" ? body.highlightNote : null,
  });

  return fromServiceResult(result);
}
