import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { getTrainingTeamProgress } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const capabilityAccess = await requireAuthenticatedManagedCapability("training");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const reportingAccess = await requireAuthenticatedManagedCapability("practice_reporting");
  if (!reportingAccess.ok) return reportingAccess.response;
  const authUser = capabilityAccess.user;

  const repository = await createEffectiveTenantRepository(createTrainingRepository(), authUser.id);
  const result = await getTrainingTeamProgress(repository, authUser.id);
  return fromServiceResult(result);
}
