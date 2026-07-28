import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import { getVoiceBalance } from "@/lib/billing/voice-balance";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await getVoiceBalance(
    new DrizzleBillingRepository(),
    authUser.id,
  );

  return fromServiceResult(result);
}
