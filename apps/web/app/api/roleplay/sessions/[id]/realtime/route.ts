import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { unauthorizedJson } from "@/lib/http";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { getRoleplaySession } from "@/lib/roleplay/service";
import {
  buildRoleplayRealtimeInstructions,
  createRealtimeCall,
  getOpenAiVoiceConfigurationError,
} from "@/lib/roleplay/openai-voice";

export const dynamic = "force-dynamic";

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

  const configurationError = getOpenAiVoiceConfigurationError();

  if (configurationError) {
    return unavailable();
  }

  const offerSdp = await request.text();

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
    });
    const answerSdp = await realtime.response.text();

    return new Response(answerSdp, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": realtime.response.headers.get("Content-Type") ?? "application/sdp",
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
