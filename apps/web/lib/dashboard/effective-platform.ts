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

export type BillingScopeRepository = {
  findUserBillingScope(authUserId: string): Promise<{
    email: string;
    fullName: string;
    orgName: string | null;
    orgId: string | null;
    plan: string | null;
    role: CurrentUserProfile["role"];
    userId: string;
  } | null>;
};

function createRepositoryAdapter<TRepository extends object, TOverrides extends object>(
  repository: TRepository,
  overrides: TOverrides,
) {
  return Object.assign(
    Object.create(Object.getPrototypeOf(repository)) as TRepository,
    repository,
    overrides,
  ) as TRepository & TOverrides;
}

export function createEffectiveCurrentUserRepository<
  TUser,
  TRepository extends CurrentUserLookupRepository<TUser>,
>(
  repository: TRepository,
  effectiveUser: TUser,
  authUserId: string,
): TRepository {
  return createRepositoryAdapter(repository, {
    findCurrentUserByAuthId(userId: string) {
      if (userId === authUserId) {
        return Promise.resolve(effectiveUser);
      }

      return repository.findCurrentUserByAuthId(userId);
    },
  });
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
  return createRepositoryAdapter(repository, {
    findActorByAuthUserId(userId: string) {
      if (userId === authUserId) {
        return Promise.resolve({
          id: profile.id,
          orgId: profile.org?.id ?? null,
          role: toAccessRole(profile.role),
        });
      }

      return repository.findActorByAuthUserId(userId);
    },
  });
}

export function createEffectiveBillingScopeRepository<
  TRepository extends BillingScopeRepository,
>(
  repository: TRepository,
  profile: CurrentUserProfile,
  authUserId: string,
): TRepository {
  return createRepositoryAdapter(repository, {
    findUserBillingScope(userId: string) {
      if (userId === authUserId) {
        return Promise.resolve({
          email: profile.email,
          fullName: profile.fullName,
          orgName: profile.org?.name ?? null,
          orgId: profile.org?.id ?? null,
          plan: profile.org?.plan ?? null,
          // Platform staff may inspect the selected tenant's billing state, but
          // checkout and portal actions remain bound to their authenticated account.
          role: null,
          userId: profile.id,
        });
      }

      return repository.findUserBillingScope(userId);
    },
  });
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
