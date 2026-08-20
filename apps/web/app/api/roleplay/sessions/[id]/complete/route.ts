import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import { consumeVoiceMinutes } from "@/lib/billing/voice-entitlements";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { completeRoleplaySession, settleRoleplayVoiceUsage } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("roleplay");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id } = await params;
  const roleplayRepository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await completeRoleplaySession(roleplayRepository, authUser.id, id);

  if (!result.ok) {
    return fromServiceResult(result);
  }

  const billingRepository = new DrizzleBillingRepository();
  const settlementResult = await settleRoleplayVoiceUsage(roleplayRepository, authUser.id, id, {
    consumeVoiceMinutes: (userId, input) =>
      consumeVoiceMinutes(billingRepository, userId, input),
  });

  return fromServiceResult(settlementResult);
}
