import "server-only";

import { cache } from "react";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getCurrentUserProfile } from "@/lib/dashboard/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const getCachedAuthenticatedSupabaseUser = cache(async () => getAuthenticatedSupabaseUser());

export const getCachedCurrentUserProfile = cache(async (authUserId: string) =>
  getCurrentUserProfile(createDashboardRepository(), authUserId),
);

export const getCachedCurrentUserDetails = cache(async (authUserId: string) =>
  getCurrentUserDetails(createUsersRepository(), authUserId),
);
