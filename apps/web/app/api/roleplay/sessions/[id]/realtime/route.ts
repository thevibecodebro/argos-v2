import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import {
  consumeVoiceMinutes,
  getVoiceEntitlementStatus,
} from "@/lib/billing/voice-entitlements";
import { unauthorizedJson } from "@/lib/http";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { getRoleplaySession } from "@/lib/roleplay/service";
import {
  buildRoleplayRealtimeInstructions,
  createRealtimeCall,
  getRoleplayRealtimeVoice,
  getOpenAiVoiceConfigurationError,
} from "@/lib/roleplay/openai-voice";
import { readRequestTextWithLimit } from "@/lib/security/request-body";

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
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id } = await params;
  const sessionResult = await getRoleplaySession(createRoleplayRepository(), authUser.id, id);

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
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

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

  const billingRepository = new DrizzleBillingRepository();
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
  const sessionResult = await getRoleplaySession(createRoleplayRepository(), authUser.id, id);

  if (!sessionResult.ok) {
    return Response.json({ error: sessionResult.error }, { status: sessionResult.status });
  }

  try {
    const realtime = await createRealtimeCall({
      instructions: buildRoleplayRealtimeInstructions(sessionResult.data),
      offerSdp,
      voice: getRoleplayRealtimeVoice(sessionResult.data),
    });
    await consumeVoiceMinutes(billingRepository, authUser.id, {
      idempotencyKey: `roleplay-realtime:${id}:${Date.now()}`,
      minutes: 1,
      sessionId: id,
      source: "roleplay_realtime",
    });

    return new Response(realtime.answerSdp, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": realtime.contentType,
      },
    });
  } catch (error) {
    console.error("Failed to create realtime roleplay call", error);
    return Response.json(
      { error: "Unable to start voice mode with the configured OpenAI provider." },
      { status: 502 },
    );
  }
}
