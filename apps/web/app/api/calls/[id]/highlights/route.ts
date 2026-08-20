import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail } from "@/lib/calls/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("highlights");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id } = await params;
  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await getCallDetail(repository, authUser.id, id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(
    { highlights: result.data.moments.filter((moment) => moment.isHighlight) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
