import type { AppUserRole } from "@/lib/users/roles";
import { APP_USER_ROLES } from "@/lib/users/roles";
import { getInviteEmailCapability } from "@/lib/capabilities/service";
import type { UsersRepository } from "@/lib/users/service";
import type { OnboardingRepository } from "@/lib/onboarding/service";
import type { InvitesRepository, InviteRecord } from "./repository";
import { sendInviteEmail } from "./email";

type InviteServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409 | 410 | 503; error: string };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendInvite(
  repo: InvitesRepository,
  usersRepo: UsersRepository,
  authUserId: string,
  input: { email?: unknown; role?: unknown; teamIds?: unknown },
): Promise<InviteServiceResult<InviteRecord>> {
  const caller = await usersRepo.findCurrentUserByAuthId(authUserId);

  if (!caller) {
    return { ok: false, status: 404, error: "User not found" };
  }

  if (!caller.orgId) {
    return { ok: false, status: 400, error: "You are not part of an organization" };
  }

  if (caller.role !== "admin") {
    return { ok: false, status: 403, error: "Only admins can send invites" };
  }

  const email = typeof input.email === "string" ? input.email.trim() : "";

  if (!email || !isValidEmail(email)) {
    return { ok: false, status: 400, error: "A valid email address is required" };
  }

  if (!APP_USER_ROLES.includes(input.role as AppUserRole)) {
    return { ok: false, status: 400, error: "role must be one of: rep, manager, executive, admin" };
  }

  const role = input.role as AppUserRole;
  const rawTeamIds =
    Array.isArray(input.teamIds) && (role === "rep" || role === "manager")
      ? (input.teamIds as string[])
      : null;

  // Check for existing pending invite before validating teams (spec order: 409 before 400)
  const existing = await repo.findPendingInviteByOrgAndEmail(caller.orgId, email);

  if (existing) {
    return { ok: false, status: 409, error: "A pending invite already exists for this email" };
  }

  // Validate team IDs belong to org
  if (rawTeamIds && rawTeamIds.length > 0) {
    const found = await repo.findTeamsByIds(rawTeamIds, caller.orgId);
    if (found.length !== rawTeamIds.length) {
      return { ok: false, status: 400, error: "One or more team IDs are invalid" };
    }
  }

  const inviteEmailCapability = getInviteEmailCapability();

  if (!inviteEmailCapability.available) {
    return {
      ok: false,
      status: 503,
      error: inviteEmailCapability.reason ?? "Invite email delivery is unavailable in this environment",
    };
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID();

  const invite = await repo.createInvite({
    orgId: caller.orgId,
    email,
    role,
    token,
    teamIds: rawTeamIds,
    expiresAt,
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${token}`;

  // Fetch org name for email (caller.org is available from UsersRepository)
  const orgName = caller.org?.name ?? "your organization";

  await sendInviteEmail(email, inviteUrl, orgName, role);

  return { ok: true, data: invite };
}

export type InviteCallerRecord = {
  id: string;
  email: string;
  orgId: string | null;
};

export async function commitInviteAcceptance(
  repo: InvitesRepository,
  onboardingRepo: OnboardingRepository,
  caller: InviteCallerRecord,
  invite: InviteRecord,
): Promise<InviteServiceResult<{ orgId: string }>> {
  await onboardingRepo.assignUserToOrganization({
    orgId: invite.orgId,
    userId: caller.id,
    role: invite.role,
  });

  if (invite.teamIds && invite.teamIds.length > 0 && (invite.role === "rep" || invite.role === "manager")) {
    await repo.createTeamMemberships({
      orgId: invite.orgId,
      userId: caller.id,
      teamIds: invite.teamIds,
      membershipType: invite.role,
    });
  }

  await repo.markInviteAccepted(invite.id);

  return { ok: true, data: { orgId: invite.orgId } };
}

export async function revokeInvite(
  repo: InvitesRepository,
  usersRepo: UsersRepository,
  authUserId: string,
  token: string,
): Promise<InviteServiceResult<null>> {
  const caller = await usersRepo.findCurrentUserByAuthId(authUserId);

  if (!caller) {
    return { ok: false, status: 404, error: "User not found" };
  }

  if (!caller.orgId) {
    return { ok: false, status: 400, error: "You are not part of an organization" };
  }

  if (caller.role !== "admin") {
    return { ok: false, status: 403, error: "Only admins can revoke invites" };
  }

  await repo.deleteInviteByToken(token, caller.orgId);

  return { ok: true, data: null };
}

export async function listPendingInvites(
  repo: InvitesRepository,
  usersRepo: UsersRepository,
  authUserId: string,
): Promise<InviteServiceResult<InviteRecord[]>> {
  const caller = await usersRepo.findCurrentUserByAuthId(authUserId);

  if (!caller) {
    return { ok: false, status: 404, error: "User not found" };
  }

  if (!caller.orgId) {
    return { ok: false, status: 400, error: "You are not part of an organization" };
  }

  if (caller.role !== "admin") {
    return { ok: false, status: 403, error: "Only admins can view invites" };
  }

  const invites = await repo.findPendingInvitesByOrg(caller.orgId);

  return { ok: true, data: invites };
}
