import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createOnboardingRepository } from "@/lib/onboarding/create-repository";
import { joinOrganizationForUser } from "@/lib/onboarding/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const payload = (await request.json()) as { slug?: string };
  const result = await joinOrganizationForUser(
    createOnboardingRepository(),
    authUser.id,
    payload,
  );

  return fromServiceResult(result);
}
