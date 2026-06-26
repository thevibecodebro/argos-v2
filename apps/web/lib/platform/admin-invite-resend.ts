import { generateInviteAuthLink, type GenerateInviteAuthLinkInput } from "@/lib/invites/auth-invite";
import { sendInviteEmail as defaultSendInviteEmail } from "@/lib/invites/email";
import type { PlatformStaffRole } from "./repository";

type PlatformOrganization = {
  createdAt: Date;
  id: string;
  name: string;
  plan: string;
  slug: string;
  status: "active" | "archived";
};

type PlatformInvite = {
  acceptedAt: Date | null;
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  orgId: string;
  role: "admin" | "executive" | "manager" | "rep";
  teamIds: string[] | null;
  token: string;
};

type PlatformAuditEvent = {
  id: string;
  staffUserId?: string | null;
  targetOrgId?: string | null;
  sessionId?: string | null;
  staffEmailSnapshot?: string | null;
  staffRoleSnapshot?: PlatformStaffRole | null;
  targetOrgNameSnapshot?: string | null;
  targetOrgSlugSnapshot?: string | null;
  action?: string;
  resourceType?: string;
  resourceId?: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

type PlatformServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

export type PlatformAdminInviteResendActor = {
  email?: string | null;
  role: PlatformStaffRole;
  userId: string;
};

export type PlatformAdminInviteResendRepository = {
  countAdminMembersForOrganization(orgId: string): Promise<number>;
  createAuditEvent(input: {
    action: string;
    metadata?: Record<string, unknown>;
    reason: string;
    resourceId?: string | null;
    resourceType: string;
    staffEmailSnapshot?: string | null;
    staffRoleSnapshot?: PlatformStaffRole | null;
    staffUserId?: string | null;
    targetOrgId?: string | null;
    targetOrgNameSnapshot?: string | null;
    targetOrgSlugSnapshot?: string | null;
  }): Promise<PlatformAuditEvent>;
  extendInviteExpiration(inviteId: string, expiresAt: Date): Promise<void>;
  findLatestAdminInviteForOrganization(orgId: string): Promise<PlatformInvite | null>;
  findOrganizationBySlug(slug: string): Promise<PlatformOrganization | null>;
};

type ResendPlatformAdminInviteInput = {
  slug?: unknown;
};

type ResendPlatformAdminInviteDependencies = {
  generateAuthInviteLink?: (input: GenerateInviteAuthLinkInput) => Promise<string>;
  now?: () => Date;
  sendInviteEmail?: typeof defaultSendInviteEmail;
};

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export async function resendPlatformAdminInvite(
  repository: PlatformAdminInviteResendRepository,
  actor: PlatformAdminInviteResendActor,
  input: ResendPlatformAdminInviteInput,
  dependencies: ResendPlatformAdminInviteDependencies = {},
): Promise<
  PlatformServiceResult<{
    auditEvent: PlatformAuditEvent;
    invite: {
      email: string;
      expiresAt: Date;
      extended: boolean;
    };
  }>
> {
  if (actor.role !== "owner" && actor.role !== "operator") {
    return { ok: false, status: 403, error: "Platform operator access required" };
  }

  const slug = getTrimmedString(input.slug);

  if (!slug) {
    return { ok: false, status: 400, error: "slug is required" };
  }

  const organization = await repository.findOrganizationBySlug(slug);

  if (!organization || organization.status !== "active") {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  const adminCount = await repository.countAdminMembersForOrganization(organization.id);

  if (adminCount > 0) {
    return {
      ok: false,
      status: 409,
      error: "Organization already has an active admin",
    };
  }

  const invite = await repository.findLatestAdminInviteForOrganization(organization.id);

  if (!invite || invite.acceptedAt || invite.role !== "admin") {
    return { ok: false, status: 404, error: "Pending admin invite not found" };
  }

  const now = dependencies.now?.() ?? new Date();
  let expiresAt = invite.expiresAt;
  let extended = false;

  if (expiresAt <= now) {
    expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await repository.extendInviteExpiration(invite.id, expiresAt);
    extended = true;
  }

  const authInviteUrl = await (dependencies.generateAuthInviteLink ?? generateInviteAuthLink)({
    email: invite.email,
    redirectTo: `${getSiteUrl()}/invite/${invite.token}`,
    metadata: {
      argosInviteToken: invite.token,
      argosOrganizationId: organization.id,
      argosRole: "admin",
    },
  });

  await (dependencies.sendInviteEmail ?? defaultSendInviteEmail)(
    invite.email,
    authInviteUrl,
    organization.name,
    "admin",
  );

  const auditEvent = await repository.createAuditEvent({
    action: "platform.organization.admin_invite.resend",
    metadata: {
      email: invite.email,
      extended,
      expiresAt: expiresAt.toISOString(),
    },
    reason: "Platform admin invite resend",
    resourceId: invite.id,
    resourceType: "invite",
    staffEmailSnapshot: actor.email ?? null,
    staffRoleSnapshot: actor.role,
    staffUserId: actor.userId,
    targetOrgId: organization.id,
    targetOrgNameSnapshot: organization.name,
    targetOrgSlugSnapshot: organization.slug,
  });

  return {
    ok: true,
    data: {
      auditEvent,
      invite: {
        email: invite.email,
        expiresAt,
        extended,
      },
    },
  };
}
