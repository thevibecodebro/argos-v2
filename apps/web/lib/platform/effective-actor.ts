import type { DashboardUserRecord } from "@/lib/dashboard/service";
import type { WorkspaceTheme } from "@/lib/organizations/workspace-theme";
import type { PlatformAccessSessionStatus, PlatformStaffRole, PlatformStaffStatus } from "./repository";

export const PLATFORM_SESSION_COOKIE_NAME = "argos_platform_session";

type PlatformStaffRecord = {
  userId: string;
  role: PlatformStaffRole;
  status: PlatformStaffStatus;
};

type PlatformAccessSessionRecord = {
  id: string;
  staffUserId: string | null;
  targetOrgId: string | null;
  targetOrgName?: string | null;
  targetOrgSlug?: string | null;
  targetOrgWorkspaceTheme?: WorkspaceTheme | null;
  targetOrgNameSnapshot?: string | null;
  targetOrgSlugSnapshot?: string | null;
  reason: string;
  status: PlatformAccessSessionStatus;
};

export type EffectiveActorRepository = {
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findStaffByUserId(userId: string): Promise<PlatformStaffRecord | null>;
  findActiveAccessSession(
    sessionId: string,
    staffUserId: string,
  ): Promise<PlatformAccessSessionRecord | null>;
};

export type EffectiveActor =
  | {
      kind: "user";
      profile: DashboardUserRecord;
      platform: null;
    }
  | {
      kind: "platform";
      profile: DashboardUserRecord;
      platform: {
        sessionId: string;
        staffUserId: string;
        reason: string;
      };
    };

type CookieSource =
  | Map<string, string>
  | {
      get(name: string): { value?: string } | string | undefined;
    };

export function getPlatformSessionCookieValue(cookies: CookieSource): string | null {
  const value =
    cookies instanceof Map
      ? cookies.get(PLATFORM_SESSION_COOKIE_NAME)
      : cookies.get(PLATFORM_SESSION_COOKIE_NAME);

  if (typeof value === "string") {
    return value.trim() || null;
  }

  return value?.value?.trim() || null;
}

export async function resolveEffectiveActor(
  repository: EffectiveActorRepository,
  input: {
    authUserId: string;
    cookies: CookieSource;
  },
): Promise<EffectiveActor | null> {
  async function resolveRegularUser() {
    const profile = await repository.findCurrentUserByAuthId(input.authUserId);
    return profile ? { kind: "user" as const, profile, platform: null } : null;
  }

  const platformSessionId = getPlatformSessionCookieValue(input.cookies);

  if (!platformSessionId) {
    return resolveRegularUser();
  }

  const staff = await repository.findStaffByUserId(input.authUserId);

  if (staff?.status !== "active") {
    return resolveRegularUser();
  }

  const session = await repository.findActiveAccessSession(platformSessionId, input.authUserId);

  if (!session?.targetOrgId) {
    return resolveRegularUser();
  }

  const targetOrgName = session.targetOrgName ?? session.targetOrgNameSnapshot ?? "Customer organization";
  const targetOrgSlug = session.targetOrgSlug ?? session.targetOrgSlugSnapshot ?? session.targetOrgId;

  return {
    kind: "platform",
    profile: {
      id: input.authUserId,
      email: `platform:${input.authUserId}`,
      role: "admin",
      firstName: null,
      lastName: null,
      org: {
        id: session.targetOrgId,
        name: targetOrgName,
        slug: targetOrgSlug,
        plan: "trial",
        logoUrl: null,
        workspaceTheme: session.targetOrgWorkspaceTheme ?? null,
      },
    },
    platform: {
      reason: session.reason,
      sessionId: session.id,
      staffUserId: input.authUserId,
    },
  };
}
