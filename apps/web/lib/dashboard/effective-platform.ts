import type { AccessActorRole } from "@/lib/access/permissions";
import type { AccessRepository } from "@/lib/access/repository.types";
import type {
  CurrentUserProfile,
  DashboardRepository,
  DashboardUserRecord,
} from "./service";

type CurrentUserLookupRepository<TUser> = {
  findCurrentUserByAuthId(authUserId: string): Promise<TUser | null>;
};

export function createEffectiveCurrentUserRepository<
  TUser,
  TRepository extends CurrentUserLookupRepository<TUser>,
>(
  repository: TRepository,
  effectiveUser: TUser,
  authUserId: string,
): TRepository {
  return {
    ...repository,
    findCurrentUserByAuthId(userId) {
      if (userId === authUserId) {
        return Promise.resolve(effectiveUser);
      }

      return repository.findCurrentUserByAuthId(userId);
    },
  };
}

export function createEffectiveDashboardRepository(
  repository: DashboardRepository,
  profile: CurrentUserProfile,
  authUserId: string,
): DashboardRepository {
  return createEffectiveCurrentUserRepository(
    repository,
    toEffectiveDashboardUserRecord(profile),
    authUserId,
  );
}

export function createEffectiveAccessRepository(
  repository: AccessRepository,
  profile: CurrentUserProfile,
  authUserId: string,
): AccessRepository {
  return {
    ...repository,
    findActorByAuthUserId(userId) {
      if (userId === authUserId) {
        return Promise.resolve({
          id: profile.id,
          orgId: profile.org?.id ?? null,
          role: toAccessRole(profile.role),
        });
      }

      return repository.findActorByAuthUserId(userId);
    },
  };
}

export function toEffectiveDashboardUserRecord(profile: CurrentUserProfile): DashboardUserRecord {
  return {
    email: profile.email,
    firstName: null,
    id: profile.id,
    lastName: profile.fullName || null,
    org: profile.org,
    role: profile.role,
  };
}

function toAccessRole(role: CurrentUserProfile["role"]): AccessActorRole | null {
  if (
    role === "admin" ||
    role === "executive" ||
    role === "manager" ||
    role === "rep"
  ) {
    return role;
  }

  return null;
}
