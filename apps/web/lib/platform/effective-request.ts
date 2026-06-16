import "server-only";

import type { AccessRepository } from "@/lib/access/repository.types";
import { getCachedCurrentUserProfile } from "@/lib/auth/request-user";
import {
  createEffectiveAccessRepository,
  createEffectiveCurrentUserRepository,
  toEffectiveDashboardUserRecord,
} from "@/lib/dashboard/effective-platform";
import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type {
  TeamAccessRepository,
  TeamAccessViewer,
} from "@/lib/team-access/service";
import type { UsersRepository } from "@/lib/users/service";

type DashboardUserLookupRepository = {
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
};

function isPlatformSessionProfile(email: string | null | undefined) {
  return email?.startsWith("platform:") ?? false;
}

export async function createEffectiveTenantRepository<
  TRepository extends DashboardUserLookupRepository,
>(repository: TRepository, authUserId: string): Promise<TRepository> {
  const profile = await getCachedCurrentUserProfile(authUserId);

  if (!profile || !isPlatformSessionProfile(profile.email)) {
    return repository;
  }

  return createEffectiveCurrentUserRepository(
    repository,
    toEffectiveDashboardUserRecord(profile),
    authUserId,
  );
}

export async function createEffectiveTenantAccessRepository(
  repository: AccessRepository,
  authUserId: string,
): Promise<AccessRepository> {
  const profile = await getCachedCurrentUserProfile(authUserId);

  if (!profile || !isPlatformSessionProfile(profile.email)) {
    return repository;
  }

  return createEffectiveAccessRepository(repository, profile, authUserId);
}

export async function createEffectiveTenantUsersRepository(
  repository: UsersRepository,
  authUserId: string,
): Promise<UsersRepository> {
  const profile = await getCachedCurrentUserProfile(authUserId);

  if (!profile || !isPlatformSessionProfile(profile.email)) {
    return repository;
  }

  const effectiveUser: NonNullable<Awaited<ReturnType<UsersRepository["findCurrentUserByAuthId"]>>> = {
    displayNameSet: true,
    email: profile.email,
    firstName: null,
    id: profile.id,
    lastName: profile.fullName || null,
    org: profile.org
      ? {
          createdAt: new Date(0),
          id: profile.org.id,
          logoUrl: profile.org.logoUrl ?? null,
          name: profile.org.name,
          plan: profile.org.plan,
          slug: profile.org.slug,
        }
      : null,
    orgId: profile.org?.id ?? null,
    profileImageUrl: null,
    role: profile.role,
  };

  return createEffectiveCurrentUserRepository(repository, effectiveUser, authUserId);
}

export async function createEffectiveTenantTeamAccessRepository(
  repository: TeamAccessRepository,
  authUserId: string,
): Promise<TeamAccessRepository> {
  const profile = await getCachedCurrentUserProfile(authUserId);

  if (!profile || !isPlatformSessionProfile(profile.email)) {
    return repository;
  }

  const effectiveViewer: TeamAccessViewer = {
    id: profile.id,
    org: profile.org
      ? {
          id: profile.org.id,
          name: profile.org.name,
          plan: profile.org.plan,
          slug: profile.org.slug,
        }
      : null,
    role: profile.role,
  };

  return createEffectiveCurrentUserRepository(repository, effectiveViewer, authUserId);
}
