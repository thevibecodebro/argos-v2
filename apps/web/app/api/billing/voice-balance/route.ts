import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import { getVoiceBalance } from "@/lib/billing/voice-balance";
import { fromServiceResult } from "@/lib/http";
import { createEffectiveTenantBillingRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  const capabilityAccess = await requireAuthenticatedManagedCapability("roleplay_voice");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const billingRepository = await createEffectiveTenantBillingRepository(
    new DrizzleBillingRepository(),
    authUser.id,
  );
  const result = await getVoiceBalance(billingRepository, authUser.id);

  return fromServiceResult(result);
}
