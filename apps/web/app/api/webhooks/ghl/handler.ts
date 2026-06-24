import { NextResponse } from "next/server";
import { createGhlWebhookRepository } from "@/lib/integrations/create-ghl-webhook-repository";
import { processGhlWebhookRequest } from "@/lib/integrations/ghl-webhook";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { readRequestTextWithLimit } from "@/lib/security/request-body";

const MAX_GHL_WEBHOOK_BODY_BYTES = 128 * 1024;
const PUBLIC_WEBHOOK_RATE_LIMIT_SUBJECT = {
  type: "route",
  id: "public",
} as const;

export async function processGhlWebhookPost(request: Request, token: string | null) {
  try {
    const rateLimit = await checkRateLimitForPolicy(
      "ghlWebhook",
      PUBLIC_WEBHOOK_RATE_LIMIT_SUBJECT,
    );

    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
    }

    const rawBodyResult = await readRequestTextWithLimit(request, MAX_GHL_WEBHOOK_BODY_BYTES);

    if (!rawBodyResult.ok) {
      return NextResponse.json(
        { error: "GHL webhook payload is too large." },
        { status: 413 },
      );
    }

    const result = await processGhlWebhookRequest(createGhlWebhookRepository(), {
      headers: {
        token,
      },
      rawBody: rawBodyResult.text,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Failed to process GHL webhook", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
