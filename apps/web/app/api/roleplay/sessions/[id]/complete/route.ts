import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import { consumeVoiceMinutes } from "@/lib/billing/voice-entitlements";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { completeRoleplaySession, settleRoleplayVoiceUsage } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id } = await params;
  const roleplayRepository = createRoleplayRepository();
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
