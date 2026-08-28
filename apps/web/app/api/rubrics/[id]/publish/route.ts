import { NextResponse } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createEffectiveTenantUsersRepository } from "@/lib/platform/effective-request";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { publishRubric } from "@/lib/rubrics/service";
import { createUsersRepository } from "@/lib/users/create-repository";

export const dynamic = "force-dynamic";

type AdminContext =
  | { ok: true; authUserId: string; orgId: string }
  | { ok: false; response: Response };

async function requireAdminContext(): Promise<AdminContext> {
  const capabilityAccess = await requireAuthenticatedManagedCapability("team_rubrics");
  if (!capabilityAccess.ok) return capabilityAccess;
  const authUser = capabilityAccess.user;

  const usersRepository = await createEffectiveTenantUsersRepository(
    createUsersRepository(),
    authUser.id,
  );
  const caller = await usersRepository.findCurrentUserByAuthId(authUser.id);

  if (!caller?.orgId || caller.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    authUserId: authUser.id,
    orgId: caller.orgId,
  };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdminContext();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await context.params;
    const published = await publishRubric(createRubricsRepository(), {
      orgId: admin.orgId,
      rubricId: id,
      publishedBy: admin.authUserId,
    });

    if (!published) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    return NextResponse.json(published, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to publish rubric", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
