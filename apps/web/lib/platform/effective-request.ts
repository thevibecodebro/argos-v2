import "server-only";

import { cookies } from "next/headers";
import type { AccessRepository } from "@/lib/access/repository.types";
import { getCachedCurrentUserProfile } from "@/lib/auth/request-user";
import {
  createEffectiveAccessRepository,
  createEffectiveCurrentUserRepository,
  toEffectiveDashboardUserRecord,
} from "@/lib/dashboard/effective-platform";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
  type PlatformMutationAuditContext,
  type PlatformMutationAuditRepository,
} from "@/lib/platform/audit";
import { createPlatformRepository } from "@/lib/platform/create-repository";
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

const mutationMethodPattern =
  /^(accept|add|append|archive|assign|clear|complete|connect|create|delete|disconnect|grant|insert|mark|publish|record|remove|rename|restore|revoke|rotate|save|send|set|start|store|submit|sync|unassign|update|upsert)(?:$|[A-Z_])/;

function isMutationMethod(property: PropertyKey): property is string {
  return typeof property === "string" && mutationMethodPattern.test(property);
}

function toSnakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function getResourceId(result: unknown) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const value = (result as { id?: unknown }).id;
  return typeof value === "string" && value.trim() ? value : null;
}

function createPlatformAuditedRepository<TRepository extends object>(
  repository: TRepository,
  platformRepository: PlatformMutationAuditRepository,
  context: PlatformMutationAuditContext | null,
): TRepository {
  if (!context) {
    return repository;
  }

  return new Proxy(repository, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (typeof value !== "function") {
        return value;
      }

      if (!isMutationMethod(property)) {
        return value.bind(target);
      }

      return async (...args: unknown[]) => {
        const result = await value.apply(target, args);
        await auditPlatformWorkspaceMutation(platformRepository, context, {
          action: `platform.workspace.repository.${toSnakeCase(property)}`,
          metadata: {
            method: property,
          },
          resourceId: getResourceId(result),
          resourceType: "tenant_repository_method",
        });
        return result;
      };
    },
  });
}

async function createPlatformAuditedEffectiveRepository<TRepository extends object>(
  repository: TRepository,
  authUserId: string,
): Promise<TRepository> {
  const platformRepository = createPlatformRepository();
  const context = await getPlatformMutationAuditContext(platformRepository, {
    authUserId,
    cookies: await cookies(),
  });
  return createPlatformAuditedRepository(repository, platformRepository, context);
}

export async function createEffectiveTenantRepository<
  TRepository extends DashboardUserLookupRepository,
>(repository: TRepository, authUserId: string): Promise<TRepository> {
  const profile = await getCachedCurrentUserProfile(authUserId);

  if (!profile || !isPlatformSessionProfile(profile.email)) {
    return repository;
  }

  const effectiveRepository = createEffectiveCurrentUserRepository(
    repository,
    toEffectiveDashboardUserRecord(profile),
    authUserId,
  );
  return createPlatformAuditedEffectiveRepository(effectiveRepository, authUserId);
}

export async function createEffectiveTenantAccessRepository(
  repository: AccessRepository,
  authUserId: string,
): Promise<AccessRepository> {
  const profile = await getCachedCurrentUserProfile(authUserId);

  if (!profile || !isPlatformSessionProfile(profile.email)) {
    return repository;
  }

  const effectiveRepository = createEffectiveAccessRepository(repository, profile, authUserId);
  return createPlatformAuditedEffectiveRepository(effectiveRepository, authUserId);
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

  const effectiveRepository = createEffectiveCurrentUserRepository(
    repository,
    effectiveUser,
    authUserId,
  );
  return createPlatformAuditedEffectiveRepository(effectiveRepository, authUserId);
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

  const effectiveRepository = createEffectiveCurrentUserRepository(
    repository,
    effectiveViewer,
    authUserId,
  );
  return createPlatformAuditedEffectiveRepository(effectiveRepository, authUserId);
}
