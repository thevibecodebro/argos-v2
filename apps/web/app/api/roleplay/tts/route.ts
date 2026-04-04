import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { unauthorizedJson } from "@/lib/http";
import { createSpeechAudio, getOpenAiVoiceConfigurationError } from "@/lib/roleplay/openai-voice";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const configurationError = getOpenAiVoiceConfigurationError();

  if (configurationError) {
    return Response.json({ error: configurationError }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as
    | { text?: string; voice?: string; instructions?: string }
    | null;
  const text = body?.text?.trim();

  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const response = await createSpeechAudio({
      instructions: body?.instructions,
      text,
      voice: body?.voice?.trim() || undefined,
    });
    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": response.headers.get("Content-Type") ?? "audio/mpeg",
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
