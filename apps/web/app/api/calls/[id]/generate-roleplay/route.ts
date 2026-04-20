import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail } from "@/lib/calls/service";
import { unauthorizedJson } from "@/lib/http";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import {
  buildGeneratedRoleplayPreview,
  createGeneratedRoleplaySession,
} from "@/lib/roleplay/generate-from-call";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { loadActiveRubric } from "@/lib/rubrics/service";

export const dynamic = "force-dynamic";

async function loadGenerateRoleplayContext(authUserId: string, callId: string) {
  const detailResult = await getCallDetail(createCallsRepository(), authUserId, callId);

  if (!detailResult.ok) {
    return detailResult;
  }

  const roleplayRepository = createRoleplayRepository();
  const viewer = await roleplayRepository.findCurrentUserByAuthId(authUserId);
  const activeRubric = viewer?.org?.id
    ? await loadActiveRubric(createRubricsRepository(), viewer.org.id)
    : null;

  return {
    ok: true as const,
    data: {
      activeRubric,
      call: detailResult.data,
      roleplayRepository,
    },
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const { id } = await params;
    const context = await loadGenerateRoleplayContext(authUser.id, id);

    if (!context.ok) {
      return Response.json({ error: context.error }, { status: context.status });
    }

    return Response.json(
      buildGeneratedRoleplayPreview({
        call: context.data.call,
        activeRubric: context.data.activeRubric,
      }),
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("Failed to load generated roleplay preview", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const body = (await request.json().catch(() => null)) as
      | { focusCategorySlug?: unknown }
      | null;

    const { id } = await params;
    const context = await loadGenerateRoleplayContext(authUser.id, id);

    if (!context.ok) {
      return Response.json({ error: context.error }, { status: context.status });
    }

    const focusCategorySlug =
      typeof body?.focusCategorySlug === "string" &&
      body.focusCategorySlug.trim() &&
      body.focusCategorySlug.trim() !== "all"
        ? body.focusCategorySlug.trim()
        : null;

    const result = await createGeneratedRoleplaySession(
      context.data.roleplayRepository,
      authUser.id,
      {
        call: context.data.call,
        activeRubric: context.data.activeRubric,
        focusCategorySlug,
      },
    );

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to create generated roleplay session", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
