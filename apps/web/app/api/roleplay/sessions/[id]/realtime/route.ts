import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import { consumeVoiceMinutes, getVoiceEntitlementStatus } from "@/lib/billing/voice-entitlements";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { buildRoleplaySafetyIdentifier } from "@/lib/roleplay/content-policy";
import { createEffectiveTenantBillingRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { getRoleplaySession, getAuthorizedMutableSession, markRoleplayVoiceStarted } from "@/lib/roleplay/service";
import {
  buildRoleplayRealtimeInstructions,
  createRealtimeCall,
  getRoleplayRealtimeVoice,
  getOpenAiVoiceConfigurationError,
} from "@/lib/roleplay/openai-voice";
import { readRequestTextWithLimit } from "@/lib/security/request-body";

import { createVoiceSegmentsRepository } from "@/lib/roleplay/voice-segments";

export const dynamic = "force-dynamic";

const MAX_REALTIME_SDP_BODY_BYTES = 64 * 1024;

function serviceErrorResponse(result: {
  code?: string;
  error: string;
  status: number;
}) {
  return Response.json(
    {
      ...(result.code ? { code: result.code } : {}),
      error: result.error,
    },
    { status: result.status },
  );
}

function unavailable() {
  return Response.json(
    {
      error:
        getOpenAiVoiceConfigurationError() ??
        "Realtime roleplay requires a configured realtime voice provider and public callback host.",
    },
    { status: 503 },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("roleplay_voice");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const { id } = await params;
  const roleplayRepository = createRoleplayRepository();
  const sessionResult = await getRoleplaySession(roleplayRepository, authUser.id, id, {
    allowOtherRep: hasManagedCapability(capabilityAccess.access, "practice_reporting"),
  });

  if (!sessionResult.ok) {
    return Response.json({ error: sessionResult.error }, { status: sessionResult.status });
  }

  const configurationError = getOpenAiVoiceConfigurationError();

  if (configurationError) {
    return unavailable();
  }

  return Response.json(
    {
      available: true,
      persona: sessionResult.data.personaDetails?.name ?? sessionResult.data.persona ?? null,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("roleplay_voice");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

  const rateLimit = await checkRateLimitForPolicy("roleplayRealtime", {
    type: "user",
    id: authUser.id,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const configurationError = getOpenAiVoiceConfigurationError();

  if (configurationError) {
    return unavailable();
  }

  const billingRepository = await createEffectiveTenantBillingRepository(
    new DrizzleBillingRepository(),
    authUser.id,
  );
  const entitlement = await getVoiceEntitlementStatus(billingRepository, authUser.id);

  if (!entitlement.ok) {
    return serviceErrorResponse(entitlement);
  }

  const offerSdpResult = await readRequestTextWithLimit(request, MAX_REALTIME_SDP_BODY_BYTES);

  if (!offerSdpResult.ok) {
    return Response.json(
      { error: `SDP offer is too large. Maximum size is ${MAX_REALTIME_SDP_BODY_BYTES} bytes.` },
      { status: 400 },
    );
  }

  const offerSdp = offerSdpResult.text;

  if (!offerSdp.trim()) {
    return Response.json({ error: "An SDP offer is required." }, { status: 400 });
  }

  const { id } = await params;
  const roleplayRepository = createRoleplayRepository();
  const sessionResult = await getAuthorizedMutableSession(roleplayRepository, authUser.id, id);
  if (!sessionResult.ok) return serviceErrorResponse(sessionResult);
  if (sessionResult.data.status !== "active") return Response.json({ error: "Roleplay session is already complete" }, { status: 409 });
  const segmentId = request.headers.get("X-Roleplay-Voice-Segment");
  if (segmentId === null) {
    return Response.json({
      code: "voice_client_upgrade_required",
      error: "Voice practice has been updated. Refresh this page, then start voice practice again.",
    }, { status: 409 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segmentId)) {
    return Response.json({ error: "A valid voice segment ID is required." }, { status: 400 });
  }
  const segments = createVoiceSegmentsRepository();
  const prepared = await segments.prepare(id, segmentId);
  if (!prepared.created || prepared.stoppedAt) return Response.json({ error: "Voice start was cancelled or already attempted. Start again." }, { status: 409 });
  const serializedSession = await getRoleplaySession(roleplayRepository, authUser.id, id, { allowOtherRep: true });
  if (!serializedSession.ok) return serviceErrorResponse(serializedSession);
  try {
    const reservation = await consumeVoiceMinutes(billingRepository, authUser.id, {
      idempotencyKey: `roleplay:${id}:start`,
      minutes: 1, sessionId: id, source: "roleplay_realtime",
    });
    if (!reservation.ok) { await segments.stop(id, segmentId, new Date()); return serviceErrorResponse(reservation); }
    const realtime = await createRealtimeCall({
      instructions: buildRoleplayRealtimeInstructions(serializedSession.data),
      offerSdp,
      safetyIdentifier: buildRoleplaySafetyIdentifier(authUser.id, id),
      voice: getRoleplayRealtimeVoice(serializedSession.data),
    });
    const segment = await segments.start(id, segmentId, new Date());
    if (segment.stoppedAt || !segment.startedAt) return Response.json({ error: "Voice start was cancelled." }, { status: 409 });
    const markStartedResult = await markRoleplayVoiceStarted(
      roleplayRepository,
      authUser.id,
      id,
      new Date(),
      { reservedMinutesSettled: reservation.data.minutesDebited },
    );

    if (!markStartedResult.ok) {
      return serviceErrorResponse(markStartedResult);
    }

    return new Response(realtime.answerSdp, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": realtime.contentType,
      },
    });
  } catch (error) {
    await segments.stop(id, segmentId, new Date());
    console.error("Failed to create realtime roleplay call", error);
    return Response.json(
      { error: "Unable to start voice mode with the configured OpenAI provider." },
      { status: 502 },
    );
  }
}
