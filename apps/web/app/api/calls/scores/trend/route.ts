import { type NextRequest } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getScoreTrend } from "@/lib/calls/service";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("call_analytics");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const searchParams = request.nextUrl.searchParams;
  const days = searchParams.get("days");

  const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
  const result = await getScoreTrend(repository, authUser.id, {
    repId: searchParams.get("repId") ?? undefined,
    days: days ? Number(days) : undefined,
  });

  return fromServiceResult(result);
}
