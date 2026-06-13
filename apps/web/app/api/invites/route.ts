import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
} from "@/lib/platform/audit";
import { createUsersRepository } from "@/lib/users/create-repository";
import { sendInvite, listPendingInvites } from "@/lib/invites/service";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const usersRepository = createUsersRepository();
  const platformRepository = createPlatformRepository();
  const platformAuditContext = await getPlatformMutationAuditContext(platformRepository, {
    authUserId: authUser.id,
    cookies: await cookies(),
  });
  const caller = platformAuditContext
    ? {
        id: authUser.id,
        email: platformAuditContext.staffEmailSnapshot ?? `platform:${authUser.id}`,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        role: "admin" as const,
        orgId: platformAuditContext.targetOrgId,
        displayNameSet: true,
        org: {
          id: platformAuditContext.targetOrgId,
          name: platformAuditContext.targetOrgNameSnapshot ?? "Customer organization",
          slug: platformAuditContext.targetOrgSlugSnapshot ?? platformAuditContext.targetOrgId,
          plan: "trial",
          logoUrl: null,
          createdAt: new Date(),
        },
      }
    : await usersRepository.findCurrentUserByAuthId(authUser.id);

  if (!caller) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!caller.orgId) {
    return NextResponse.json(
      { error: "You are not part of an organization" },
      { status: 400 },
    );
  }

  if (caller.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can send invites" },
      { status: 403 },
    );
  }

  const rateLimit = await checkRateLimitForPolicy("invites", {
    type: "org",
    id: caller.orgId,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const payload = (await request.json()) as {
    email?: unknown;
    role?: unknown;
    teamIds?: unknown;
  };

  try {
    const result = await sendInvite(
      createInvitesRepository(),
      usersRepository,
      authUser.id,
      payload,
      { caller },
    );
    if (result.ok) {
      await auditPlatformWorkspaceMutation(platformRepository, platformAuditContext, {
        action: "platform.workspace.invite.create",
        resourceType: "invite",
        resourceId: result.data.id,
        metadata: {
          email: result.data.email,
          role: result.data.role,
          route: "/api/invites",
        },
      });
    }
    return fromServiceResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to send invite:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await listPendingInvites(
    createInvitesRepository(),
    createUsersRepository(),
    authUser.id,
  );

  return fromServiceResult(result);
}
