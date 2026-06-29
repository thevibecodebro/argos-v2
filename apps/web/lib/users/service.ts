import {
  parseWorkspaceTheme,
  type WorkspaceTheme,
} from "@/lib/organizations/workspace-theme";
import type { AppUserRole } from "./roles";
import type { AuthSessionRevoker } from "./session-revocation";

type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl?: string | null;
  workspaceTheme?: WorkspaceTheme | null;
  createdAt: Date;
};

type CurrentUserRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: AppUserRole | null;
  orgId: string | null;
  displayNameSet: boolean;
  org: OrganizationRecord | null;
};

type OrganizationMemberRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: AppUserRole | null;
  callCount: number;
  joinedAt: Date;
  primaryManagerId: string | null;
};

type OrganizationMemberLookup = {
  id: string;
  orgId: string | null;
  role: AppUserRole | null;
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404; error: string };

export type CurrentUserDetails = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: AppUserRole | null;
  orgId: string | null;
  displayNameSet: boolean;
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    logoUrl: string | null;
    workspaceTheme: WorkspaceTheme | null;
    createdAt: string;
  } | null;
};

export type OrganizationMember = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: AppUserRole | null;
  callCount: number;
  joinedAt: string;
  primaryManagerId: string | null;
};

export interface UsersRepository {
  deprovisionOrganizationMember(input: {
    actorId: string;
    orgId: string;
    reason: string;
    targetUserId: string;
    ticketId: string | null;
  }): Promise<boolean>;
  findCurrentUserByAuthId(
    authUserId: string,
  ): Promise<CurrentUserRecord | null>;
  findOrganizationMember(
    userId: string,
    orgId: string,
  ): Promise<OrganizationMemberLookup | null>;
  findOrganizationMembers(orgId: string): Promise<OrganizationMemberRecord[]>;
  removeOrganizationMember(userId: string, orgId: string): Promise<boolean>;
  updateCurrentUserProfile(
    userId: string,
    patch: {
      displayNameSet: boolean;
      firstName: string | null;
      lastName: string | null;
    },
  ): Promise<CurrentUserRecord | null>;
  updateOrganizationLogo(
    orgId: string,
    logoUrl: string | null,
  ): Promise<OrganizationRecord | null>;
  updateOrganizationWorkspaceTheme(
    orgId: string,
    workspaceTheme: WorkspaceTheme | null,
  ): Promise<OrganizationRecord | null>;
  updateOrganizationMemberRole(
    userId: string,
    orgId: string,
    role: AppUserRole,
  ): Promise<{ id: string; role: AppUserRole } | null>;
}

function canViewOrganizationMembers(
  role: AppUserRole | null | undefined,
): boolean {
  return role === "admin" || role === "executive";
}

function serializeCurrentUser(user: CurrentUserRecord): CurrentUserDetails {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    orgId: user.orgId,
    displayNameSet: user.displayNameSet,
    org: user.org
      ? {
          id: user.org.id,
          name: user.org.name,
          slug: user.org.slug,
          plan: user.org.plan,
          logoUrl: user.org.logoUrl ?? null,
          workspaceTheme: user.org.workspaceTheme ?? null,
          createdAt: user.org.createdAt.toISOString(),
        }
      : null,
  };
}

function serializeMember(member: OrganizationMemberRecord): OrganizationMember {
  return {
    ...member,
    joinedAt: member.joinedAt.toISOString(),
  };
}

export async function getCurrentUserDetails(
  repository: UsersRepository,
  authUserId: string,
): Promise<ServiceResult<CurrentUserDetails>> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  return {
    ok: true,
    data: serializeCurrentUser(user),
  };
}

export async function updateCurrentUserProfile(
  repository: UsersRepository,
  authUserId: string,
  input: { firstName?: unknown; lastName?: unknown },
): Promise<ServiceResult<CurrentUserDetails>> {
  if (
    (input.firstName !== undefined && typeof input.firstName !== "string") ||
    (input.lastName !== undefined && typeof input.lastName !== "string")
  ) {
    return {
      ok: false,
      status: 400,
      error: "firstName and lastName must be strings",
    };
  }

  const updated = await repository.updateCurrentUserProfile(authUserId, {
    firstName: input.firstName?.trim() || null,
    lastName: input.lastName?.trim() || null,
    displayNameSet: true,
  });

  if (!updated) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  return {
    ok: true,
    data: serializeCurrentUser(updated),
  };
}

export async function updateOrganizationLogo(
  repository: UsersRepository,
  authUserId: string,
  logoUrl: string | null,
): Promise<ServiceResult<CurrentUserDetails>> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  if (!user.orgId) {
    return {
      ok: false,
      status: 400,
      error: "You are not part of an organization",
    };
  }

  if (user.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Only admins can update organization branding",
    };
  }

  const updatedOrg = await repository.updateOrganizationLogo(
    user.orgId,
    logoUrl,
  );

  if (!updatedOrg) {
    return {
      ok: false,
      status: 404,
      error: "Organization not found",
    };
  }

  return {
    ok: true,
    data: serializeCurrentUser({
      ...user,
      org: updatedOrg,
    }),
  };
}

export async function updateOrganizationWorkspaceTheme(
  repository: UsersRepository,
  authUserId: string,
  input: unknown | null,
): Promise<ServiceResult<CurrentUserDetails>> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  if (!user.orgId) {
    return {
      ok: false,
      status: 400,
      error: "You are not part of an organization",
    };
  }

  if (user.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Only admins can update organization branding",
    };
  }

  const parsedTheme = input === null ? null : parseWorkspaceTheme(input);

  if (parsedTheme && !parsedTheme.ok) {
    return parsedTheme;
  }

  const workspaceTheme = parsedTheme ? parsedTheme.data : null;
  const updatedOrg = await repository.updateOrganizationWorkspaceTheme(
    user.orgId,
    workspaceTheme,
  );

  if (!updatedOrg) {
    return {
      ok: false,
      status: 404,
      error: "Organization not found",
    };
  }

  return {
    ok: true,
    data: serializeCurrentUser({
      ...user,
      org: updatedOrg,
    }),
  };
}

export async function listOrganizationMembers(
  repository: UsersRepository,
  authUserId: string,
): Promise<ServiceResult<OrganizationMember[]>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  if (!viewer.orgId) {
    return {
      ok: false,
      status: 400,
      error: "You are not part of an organization",
    };
  }

  if (!canViewOrganizationMembers(viewer.role)) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
    };
  }

  const members = await repository.findOrganizationMembers(viewer.orgId);

  return {
    ok: true,
    data: members.map(serializeMember),
  };
}

export async function updateOrganizationMemberRole(
  repository: UsersRepository,
  authUserId: string,
  targetUserId: string,
  input: { role?: unknown },
): Promise<ServiceResult<{ id: string; role: AppUserRole }>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  if (!viewer.orgId) {
    return {
      ok: false,
      status: 400,
      error: "You are not part of an organization",
    };
  }

  if (viewer.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Only admins can change member roles",
    };
  }

  if (
    input.role !== "rep" &&
    input.role !== "manager" &&
    input.role !== "executive" &&
    input.role !== "admin"
  ) {
    return {
      ok: false,
      status: 400,
      error: "role must be one of: rep, manager, executive, admin",
    };
  }

  const member = await repository.findOrganizationMember(
    targetUserId,
    viewer.orgId,
  );

  if (!member) {
    return {
      ok: false,
      status: 404,
      error: "Member not found in your organization",
    };
  }

  const updated = await repository.updateOrganizationMemberRole(
    targetUserId,
    viewer.orgId,
    input.role,
  );

  if (!updated) {
    return {
      ok: false,
      status: 404,
      error: "Member not found in your organization",
    };
  }

  return {
    ok: true,
    data: updated,
  };
}

export async function removeOrganizationMember(
  repository: UsersRepository,
  authUserId: string,
  targetUserId: string,
  options: {
    reason?: unknown;
    sessionRevoker?: AuthSessionRevoker;
    ticketId?: unknown;
  } = {},
): Promise<ServiceResult<{ success: true }>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User not found",
    };
  }

  if (!viewer.orgId) {
    return {
      ok: false,
      status: 400,
      error: "You are not part of an organization",
    };
  }

  if (viewer.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Only admins can remove members",
    };
  }

  if (targetUserId === viewer.id) {
    return {
      ok: false,
      status: 400,
      error: "You cannot remove yourself from the organization",
    };
  }

  const member = await repository.findOrganizationMember(
    targetUserId,
    viewer.orgId,
  );

  if (!member) {
    return {
      ok: false,
      status: 404,
      error: "Member not found in your organization",
    };
  }

  const reason =
    typeof options.reason === "string" && options.reason.trim()
      ? options.reason.trim()
      : "Organization admin removed member";
  const ticketId =
    typeof options.ticketId === "string" && options.ticketId.trim()
      ? options.ticketId.trim()
      : null;

  const removed = await repository.deprovisionOrganizationMember({
    actorId: viewer.id,
    orgId: viewer.orgId,
    reason,
    targetUserId,
    ticketId,
  });

  if (!removed) {
    return {
      ok: false,
      status: 404,
      error: "Member not found in your organization",
    };
  }

  if (options.sessionRevoker) {
    try {
      await options.sessionRevoker.revokeUserSessions(targetUserId);
    } catch (error) {
      console.error("Failed to revoke removed member sessions", {
        error,
        targetUserId,
      });
    }
  }

  return {
    ok: true,
    data: { success: true },
  };
}
