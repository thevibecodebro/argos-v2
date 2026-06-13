import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getCurrentUserProfile, type DashboardUserRecord, type CurrentUserProfile } from "@/lib/dashboard/service";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { getPlatformSessionCookieValue, resolveEffectiveActor } from "@/lib/platform/effective-actor";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const getCachedAuthenticatedSupabaseUser = cache(async () => getAuthenticatedSupabaseUser());

function buildFullName(record: Pick<DashboardUserRecord, "email" | "firstName" | "lastName">) {
  const fullName = [record.firstName, record.lastName].filter(Boolean).join(" ").trim();
  return fullName || record.email;
}

function serializeEffectiveProfile(record: DashboardUserRecord): CurrentUserProfile {
  return {
    email: record.email,
    fullName: buildFullName(record),
    id: record.id,
    org: record.org,
    role: record.role,
  };
}

export const getCachedCurrentUserProfile = cache(async (authUserId: string) => {
  const cookieStore = await cookies();

  if (!getPlatformSessionCookieValue(cookieStore)) {
    return getCurrentUserProfile(createDashboardRepository(), authUserId);
  }

  const dashboardRepository = createDashboardRepository();
  const platformRepository = createPlatformRepository();
  const actor = await resolveEffectiveActor(
    {
      findActiveAccessSession: platformRepository.findActiveAccessSession.bind(platformRepository),
      findCurrentUserByAuthId: dashboardRepository.findCurrentUserByAuthId.bind(dashboardRepository),
      findStaffByUserId: platformRepository.findStaffByUserId.bind(platformRepository),
    },
    {
      authUserId,
      cookies: cookieStore,
    },
  );

  return actor ? serializeEffectiveProfile(actor.profile) : null;
});

export const getCachedCurrentUserDetails = cache(async (authUserId: string) =>
  getCurrentUserDetails(createUsersRepository(), authUserId),
);
