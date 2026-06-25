import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { archiveOrganizationForCurrentAdmin } from "@/lib/organizations/archive";
import { createOnboardingRepository } from "@/lib/onboarding/create-repository";
import { createOrganizationForUser } from "@/lib/onboarding/service";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { createUsersRepository } from "@/lib/users/create-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const rateLimit = await checkRateLimitForPolicy("organizationCreate", {
    type: "user",
    id: authUser.id,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const payload = (await request.json()) as { name?: string; slug?: string };
  const result = await createOrganizationForUser(
    createOnboardingRepository(),
    authUser.id,
    payload,
  );

  return fromServiceResult(result);
}

export async function DELETE(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const usersRepository = createUsersRepository();
  const currentUser = await usersRepository.findCurrentUserByAuthId(authUser.id);

  if (!currentUser) {
    return fromServiceResult({
      ok: false,
      status: 404,
      error: "User not found",
    });
  }

  const payload = (await request.json()) as {
    confirmationSlug?: unknown;
    reason?: unknown;
  };
  const result = await archiveOrganizationForCurrentAdmin(
    createPlatformRepository(),
    {
      email: currentUser.email,
      orgId: currentUser.orgId,
      role: currentUser.role,
      userId: currentUser.id,
    },
    payload,
  );

  return fromServiceResult(result);
}
