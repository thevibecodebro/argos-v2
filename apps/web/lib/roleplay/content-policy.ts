import { createHmac } from "node:crypto";

const OPENAI_MODERATION_TIMEOUT_MS = 15_000;
const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";
const DEFAULT_OPENAI_MODERATION_MODEL = "omni-moderation-latest";
const LOCAL_SAFETY_IDENTIFIER_SECRET = "argos-roleplay-safety-local-development";

type RoleplayContentPolicyEnv = Partial<Record<string, string | undefined>>;
type FetchImpl = typeof fetch;

export type RoleplayContentPolicySurface =
  | "roleplay_message"
  | "roleplay_transcript"
  | "roleplay_tts"
  | "roleplay_tts_instructions";

export type RoleplayContentPolicyResult =
  | { ok: true }
  | {
      ok: false;
      categories?: string[];
      code:
        | "roleplay_content_policy_blocked"
        | "roleplay_content_policy_unavailable"
        | "roleplay_prompt_injection_blocked";
      error: string;
      status: 400 | 503;
    };

type ModerationResponse = {
  results?: Array<{
    categories?: Record<string, boolean>;
    flagged?: boolean;
  }>;
};

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /reveal\s+(the\s+)?(hidden\s+)?(system|developer)\s+(prompt|instructions)/i,
  /\b(system|developer)\s+prompt\b/i,
  /\bdeveloper\s+message\b/i,
  /\bjailbreak\b/i,
  /\bDAN\b/,
  /you\s+are\s+chatgpt/i,
  /override\s+(the\s+)?(system|developer|roleplay)\s+instructions/i,
  /print\s+(the\s+)?(hidden\s+)?(system|developer)\s+(prompt|instructions)/i,
  /forget\s+(the\s+)?(roleplay|instructions)/i,
];

function getOpenAiModerationApiKey(env: RoleplayContentPolicyEnv) {
  return env.OPENAI_ROLEPLAY_API_KEY?.trim() || env.OPENAI_API_KEY?.trim() || null;
}

function getOpenAiModerationModel(env: RoleplayContentPolicyEnv) {
  return env.OPENAI_ROLEPLAY_MODERATION_MODEL?.trim() || DEFAULT_OPENAI_MODERATION_MODEL;
}

function getSafetyIdentifierSecret(env: RoleplayContentPolicyEnv) {
  return (
    env.ARGOS_RATE_LIMIT_HASH_SECRET?.trim() ||
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    env.DATABASE_URL?.trim() ||
    LOCAL_SAFETY_IDENTIFIER_SECRET
  );
}

function unavailablePolicyResult(): RoleplayContentPolicyResult {
  return {
    ok: false,
    status: 503,
    code: "roleplay_content_policy_unavailable",
    error: "Roleplay content policy is unavailable. Try again shortly.",
  };
}

async function fetchModerationWithTimeout(
  fetchImpl: FetchImpl,
  apiKey: string,
  model: string,
  content: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_MODERATION_TIMEOUT_MS);

  try {
    return await fetchImpl(OPENAI_MODERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: content,
        model,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getFlaggedModerationCategories(payload: ModerationResponse) {
  const firstResult = payload.results?.[0];

  if (!firstResult?.flagged) {
    return null;
  }

  return Object.entries(firstResult.categories ?? {})
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);
}

export function detectRoleplayPromptInjection(content: string) {
  const detectedPattern = PROMPT_INJECTION_PATTERNS.find((pattern) => pattern.test(content));

  if (!detectedPattern) {
    return { detected: false as const };
  }

  return {
    detected: true as const,
    pattern: detectedPattern.source,
  };
}

export async function assertRoleplayContentAllowed({
  content,
  env = process.env,
  fetchImpl = fetch,
  surface: _surface,
}: {
  content: string;
  env?: RoleplayContentPolicyEnv;
  fetchImpl?: FetchImpl;
  surface: RoleplayContentPolicySurface;
}): Promise<RoleplayContentPolicyResult> {
  const promptInjection = detectRoleplayPromptInjection(content);

  if (promptInjection.detected) {
    return {
      ok: false,
      status: 400,
      code: "roleplay_prompt_injection_blocked",
      error: "Roleplay content cannot contain prompt override instructions.",
    };
  }

  const apiKey = getOpenAiModerationApiKey(env);

  if (!apiKey) {
    return unavailablePolicyResult();
  }

  try {
    const response = await fetchModerationWithTimeout(
      fetchImpl,
      apiKey,
      getOpenAiModerationModel(env),
      content,
    );

    if (!response.ok) {
      return unavailablePolicyResult();
    }

    const payload = (await response.json().catch(() => null)) as ModerationResponse | null;

    if (!payload || !Array.isArray(payload.results)) {
      return unavailablePolicyResult();
    }

    const flaggedCategories = getFlaggedModerationCategories(payload);

    if (flaggedCategories) {
      return {
        ok: false,
        status: 400,
        code: "roleplay_content_policy_blocked",
        error: "Roleplay content could not be used for this session.",
        ...(flaggedCategories.length ? { categories: flaggedCategories } : {}),
      };
    }

    return { ok: true };
  } catch {
    return unavailablePolicyResult();
  }
}

export function roleplayContentPolicyResponse(
  result: Exclude<RoleplayContentPolicyResult, { ok: true }>,
) {
  return Response.json(
    {
      ...(result.categories ? { categories: result.categories } : {}),
      code: result.code,
      error: result.error,
    },
    { status: result.status },
  );
}

export function buildRoleplaySafetyIdentifier(
  authUserId: string,
  sessionId: string,
  env: RoleplayContentPolicyEnv = process.env,
) {
  return `roleplay:${createHmac("sha256", getSafetyIdentifierSecret(env))
    .update(`${authUserId}:${sessionId}`)
    .digest("hex")}`;
}
