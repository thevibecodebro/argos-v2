import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { getRoleplaySession } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("roleplay");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id } = await params;
  const repository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await getRoleplaySession(repository, authUser.id, id, {
    allowOtherRep: hasManagedCapability(capabilityAccess.access, "practice_reporting"),
  });
  return fromServiceResult(result);
}
