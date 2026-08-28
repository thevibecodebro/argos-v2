import {
  requireAnyAuthenticatedManagedCapability,
  requireAuthenticatedManagedCapability,
} from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail } from "@/lib/calls/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import {
  buildGeneratedRoleplayPreview,
  createGeneratedRoleplaySession,
} from "@/lib/roleplay/generate-from-call";
import { normalizeGeneratedRoleplayBuyerVoice } from "@/lib/roleplay/types";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import { loadActiveRubric } from "@/lib/rubrics/service";

export const dynamic = "force-dynamic";

async function loadGenerateRoleplayContext(authUserId: string, callId: string) {
  const callsRepository = await createEffectiveTenantRepository(createCallsRepository(), authUserId);
  const detailResult = await getCallDetail(callsRepository, authUserId, callId);

  if (!detailResult.ok) {
    return detailResult;
  }

  const roleplayRepository = await createEffectiveTenantRepository(createRoleplayRepository(), authUserId);
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

function buyerProfileNotReadyResponse(call: { buyerProfileStatus?: string | null; buyerPersonalityProfile?: unknown }) {
  if (call.buyerProfileStatus === "ready" && call.buyerPersonalityProfile) return null;
  return Response.json(
    {
      code: "buyer_profile_not_ready",
      error: call.buyerProfileStatus === "needs_review"
        ? "Confirm the buyer speaker before generating a roleplay."
        : "The buyer personality is still being prepared.",
    },
    { status: 409, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const recordingAccess = await requireAnyAuthenticatedManagedCapability(["call_upload", "call_ingestion"]);
    if (!recordingAccess.ok) return recordingAccess.response;
    const roleplayAccess = await requireAuthenticatedManagedCapability("roleplay");
    if (!roleplayAccess.ok) return roleplayAccess.response;
    const scenarioAccess = await requireAuthenticatedManagedCapability("custom_scenarios");
    if (!scenarioAccess.ok) return scenarioAccess.response;
    const authUser = recordingAccess.user;

    const { id } = await params;
    const context = await loadGenerateRoleplayContext(authUser.id, id);

    if (!context.ok) {
      return Response.json({ error: context.error }, { status: context.status });
    }
    const notReady = buyerProfileNotReadyResponse(context.data.call);
    if (notReady) return notReady;

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
    const recordingAccess = await requireAnyAuthenticatedManagedCapability(["call_upload", "call_ingestion"]);
    if (!recordingAccess.ok) return recordingAccess.response;
    const roleplayAccess = await requireAuthenticatedManagedCapability("roleplay");
    if (!roleplayAccess.ok) return roleplayAccess.response;
    const scenarioAccess = await requireAuthenticatedManagedCapability("custom_scenarios");
    if (!scenarioAccess.ok) return scenarioAccess.response;
    const authUser = recordingAccess.user;

    const body = (await request.json().catch(() => null)) as
      | { buyerVoice?: unknown; focusCategorySlug?: unknown }
      | null;

    const { id } = await params;
    const context = await loadGenerateRoleplayContext(authUser.id, id);

    if (!context.ok) {
      return Response.json({ error: context.error }, { status: context.status });
    }
    const notReady = buyerProfileNotReadyResponse(context.data.call);
    if (notReady) return notReady;

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
        buyerVoice: normalizeGeneratedRoleplayBuyerVoice(body?.buyerVoice),
        focusCategorySlug,
      },
    );

    if (!result.ok) {
      return Response.json(
        {
          ...(result.code ? { code: result.code } : {}),
          error: result.error,
        },
        { status: result.status },
      );
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
