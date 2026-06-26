import { readRequestTextWithLimit } from "@/lib/security/request-body";

export const MAX_ROLEPLAY_TEXT_CONTENT_LENGTH = 4_096;

const MAX_ROLEPLAY_TEXT_REQUEST_BODY_BYTES = 8 * 1024;

export async function readRoleplayTextJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const bodyText = await readRequestTextWithLimit(
    request,
    MAX_ROLEPLAY_TEXT_REQUEST_BODY_BYTES,
  );

  if (!bodyText.ok) {
    return {
      ok: false,
      response: Response.json({ error: "request body is too large" }, { status: 400 }),
    };
  }

  return { ok: true, body: safeParseJson(bodyText.text) };
}

export function roleplayTextContentTooLargeResponse() {
  return Response.json(
    { error: `content must be ${MAX_ROLEPLAY_TEXT_CONTENT_LENGTH} characters or fewer` },
    { status: 400 },
  );
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
