import type { AccessActorRole } from "@/lib/access/permissions";
import type { AccessRepository } from "@/lib/access/repository.types";
import type {
  CurrentUserProfile,
  DashboardRepository,
  DashboardUserRecord,
} from "./service";

export function createEffectiveDashboardRepository(
  repository: DashboardRepository,
  profile: CurrentUserProfile,
  authUserId: string,
): DashboardRepository {
  return {
    ...repository,
    findCurrentUserByAuthId(userId) {
      if (userId === authUserId) {
        return Promise.resolve(toDashboardUserRecord(profile));
      }

      return repository.findCurrentUserByAuthId(userId);
    },
  };
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

function toDashboardUserRecord(profile: CurrentUserProfile): DashboardUserRecord {
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
