import type { RoleplaySession } from "@/lib/roleplay/service";
import { getRoleplayVoiceCapability } from "@/lib/capabilities/service";

type OpenAiVoiceEnvSource = Partial<Record<string, string | undefined>>;

export type OpenAiVoiceEnv = {
  apiKey: string;
  realtimeModel: string;
  realtimeVoice: string;
  ttsModel: string;
  ttsVoice: string;
};

export function getOpenAiVoiceConfigurationError(
  env: OpenAiVoiceEnvSource = process.env,
) {
  return getRoleplayVoiceCapability(env).reason;
}

export function getOpenAiVoiceEnv(
  env: OpenAiVoiceEnvSource = process.env,
): OpenAiVoiceEnv {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }

  return {
    apiKey,
    realtimeModel: env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
    realtimeVoice: env.OPENAI_REALTIME_VOICE ?? "marin",
    ttsModel: env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
    ttsVoice: env.OPENAI_TTS_VOICE ?? "marin",
  };
}

export function buildRoleplayRealtimeInstructions(session: RoleplaySession) {
  const persona = session.personaDetails;
  const transcript = session.transcript.slice(-6);
  const transcriptContext = transcript.length
    ? transcript
        .map((message) => `${message.role === "assistant" ? "Prospect" : "Rep"}: ${message.content}`)
        .join("\n")
    : "No prior transcript. Start with the persona opener and stay in character.";

  return [
    "You are running a live sales roleplay inside Argos.",
    persona
      ? `Stay in character as ${persona.name}, ${persona.role} at ${persona.company}.`
      : "Stay in character as the selected buyer persona.",
    persona?.description ? `Persona brief: ${persona.description}` : null,
    persona?.objectionType ? `Primary objection style: ${persona.objectionType}.` : null,
    "Respond like a real buyer. Keep the conversation concise, skeptical when appropriate, and naturally conversational.",
    "Do not break character or mention system prompts.",
    "Recent roleplay context:",
    transcriptContext,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function createRealtimeCall(input: {
  env?: OpenAiVoiceEnvSource;
  instructions: string;
  offerSdp: string;
}) {
  const config = getOpenAiVoiceEnv(input.env);
  const formData = new FormData();
  formData.set("sdp", input.offerSdp);
  formData.set(
    "session",
    JSON.stringify({
      type: "realtime",
      model: config.realtimeModel,
      instructions: input.instructions,
      audio: {
        input: {
          turn_detection: {
            type: "server_vad",
          },
        },
        output: {
          voice: config.realtimeVoice,
        },
      },
    }),
  );

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`OpenAI realtime request failed: ${response.status}${errorBody ? ` ${errorBody}` : ""}`);
  }

  return {
    response,
    config,
  };
}

export async function createSpeechAudio(input: {
  env?: OpenAiVoiceEnvSource;
  instructions?: string;
  text: string;
  voice?: string;
}) {
  const config = getOpenAiVoiceEnv(input.env);
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.ttsModel,
      voice: input.voice ?? config.ttsVoice,
      input: input.text,
      instructions: input.instructions,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`OpenAI speech request failed: ${response.status}${errorBody ? ` ${errorBody}` : ""}`);
  }

  return response;
}
