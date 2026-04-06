import type { AppUserRole } from "./roles";

type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  plan: string;
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
  findCurrentUserByAuthId(authUserId: string): Promise<CurrentUserRecord | null>;
  findOrganizationMember(userId: string, orgId: string): Promise<OrganizationMemberLookup | null>;
  findOrganizationMembers(orgId: string): Promise<OrganizationMemberRecord[]>;
  removeOrganizationMember(userId: string, orgId: string): Promise<boolean>;
  updateCurrentUserProfile(
    userId: string,
    patch: { displayNameSet: boolean; firstName: string | null; lastName: string | null },
  ): Promise<CurrentUserRecord | null>;
  updateOrganizationMemberRole(
    userId: string,
    orgId: string,
    role: AppUserRole,
  ): Promise<{ id: string; role: AppUserRole } | null>;
}

function canViewOrganizationMembers(role: AppUserRole | null | undefined): boolean {
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

  const member = await repository.findOrganizationMember(targetUserId, viewer.orgId);

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

  const member = await repository.findOrganizationMember(targetUserId, viewer.orgId);

  if (!member) {
    return {
      ok: false,
      status: 404,
      error: "Member not found in your organization",
    };
  }

  await repository.removeOrganizationMember(targetUserId, viewer.orgId);

  return {
    ok: true,
    data: { success: true },
  };
}
