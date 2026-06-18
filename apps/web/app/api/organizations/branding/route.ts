import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
} from "@/lib/platform/audit";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { createEffectiveTenantUsersRepository } from "@/lib/platform/effective-request";
import { createUsersRepository } from "@/lib/users/create-repository";
import {
  getCurrentUserDetails,
  updateOrganizationWorkspaceTheme,
} from "@/lib/users/service";

export const dynamic = "force-dynamic";

function errorJson(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function requireBrandingAdmin(authUserId: string) {
  const repository = await createEffectiveTenantUsersRepository(
    createUsersRepository(),
    authUserId,
  );
  const userResult = await getCurrentUserDetails(repository, authUserId);

  if (!userResult.ok) {
    return { ok: false as const, response: fromServiceResult(userResult) };
  }

  const user = userResult.data;

  if (!user.orgId || !user.org) {
    return {
      ok: false as const,
      response: errorJson("You are not part of an organization."),
    };
  }

  if (user.role !== "admin") {
    return {
      ok: false as const,
      response: errorJson("Only admins can update organization branding.", 403),
    };
  }

  return { ok: true as const, repository };
}

async function getPlatformAudit(authUserId: string) {
  const repository = createPlatformRepository();
  const context = await getPlatformMutationAuditContext(repository, {
    authUserId,
    cookies: await cookies(),
  });

  return { context, repository };
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const admin = await requireBrandingAdmin(authUser.id);

    if (!admin.ok) {
      return admin.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorJson("Workspace branding payload must be valid JSON.");
    }

    const result = await updateOrganizationWorkspaceTheme(
      admin.repository,
      authUser.id,
      body,
    );

    if (result.ok) {
      const platformAudit = await getPlatformAudit(authUser.id);
      await auditPlatformWorkspaceMutation(
        platformAudit.repository,
        platformAudit.context,
        {
          action: "platform.workspace.branding.update",
          resourceType: "organization",
          resourceId: result.data.orgId,
          metadata: {
            route: "/api/organizations/branding",
          },
        },
      );
    }

    return fromServiceResult(result);
  } catch (error) {
    console.error("Failed to update organization branding", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const admin = await requireBrandingAdmin(authUser.id);

    if (!admin.ok) {
      return admin.response;
    }

    const result = await updateOrganizationWorkspaceTheme(
      admin.repository,
      authUser.id,
      null,
    );

    if (result.ok) {
      const platformAudit = await getPlatformAudit(authUser.id);
      await auditPlatformWorkspaceMutation(
        platformAudit.repository,
        platformAudit.context,
        {
          action: "platform.workspace.branding.restore",
          resourceType: "organization",
          resourceId: result.data.orgId,
          metadata: {
            route: "/api/organizations/branding",
          },
        },
      );
    }

    return fromServiceResult(result);
  } catch (error) {
    console.error("Failed to restore organization branding", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
