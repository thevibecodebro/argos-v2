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
import { createSpeechAudio, getOpenAiVoiceConfigurationError } from "@/lib/roleplay/openai-voice";
import { readRequestTextWithLimit } from "@/lib/security/request-body";

export const dynamic = "force-dynamic";

const MAX_TTS_TEXT_LENGTH = 4_096;
const MAX_TTS_INSTRUCTIONS_LENGTH = 2_000;
const MAX_TTS_REQUEST_BODY_BYTES = 8 * 1024;

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

export async function POST(request: Request) {
  const bodyText = await readRequestTextWithLimit(request, MAX_TTS_REQUEST_BODY_BYTES);

  if (!bodyText.ok) {
    return Response.json({ error: "request body is too large" }, { status: 400 });
  }

  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const rateLimit = await checkRateLimitForPolicy("roleplayTts", {
    type: "user",
    id: authUser.id,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const configurationError = getOpenAiVoiceConfigurationError();

  if (configurationError) {
    return Response.json({ error: configurationError }, { status: 503 });
  }

  const billingRepository = new DrizzleBillingRepository();
  const entitlement = await getVoiceEntitlementStatus(billingRepository, authUser.id);

  if (!entitlement.ok) {
    return serviceErrorResponse(entitlement);
  }

  const body = (safeParseJson(bodyText.text)) as
    | { text?: string; voice?: string; instructions?: string }
    | null;
  const text = body?.text?.trim();
  const instructions = body?.instructions?.trim();

  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  if (text.length > MAX_TTS_TEXT_LENGTH) {
    return Response.json(
      { error: `text must be ${MAX_TTS_TEXT_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }

  if (instructions && instructions.length > MAX_TTS_INSTRUCTIONS_LENGTH) {
    return Response.json(
      { error: `instructions must be ${MAX_TTS_INSTRUCTIONS_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }

  try {
    const audio = await createSpeechAudio({
      instructions,
      text,
      voice: body?.voice?.trim() || undefined,
    });
    await consumeVoiceMinutes(billingRepository, authUser.id, {
      idempotencyKey: `roleplay-tts:${authUser.id}:${Date.now()}`,
      minutes: 1,
      sessionId: null,
      source: "roleplay_tts",
    });

    return new Response(audio.arrayBuffer, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": audio.contentType,
      },
    });
  } catch (error) {
    console.error("Failed to synthesize roleplay TTS", error);
    return Response.json(
      { error: "Unable to synthesize speech with the configured OpenAI provider." },
      { status: 502 },
    );
  }
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
