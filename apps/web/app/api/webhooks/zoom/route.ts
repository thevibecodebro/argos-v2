import { NextResponse } from "next/server";
import { createZoomWebhookRepository } from "@/lib/integrations/create-zoom-webhook-repository";
import { processZoomWebhookRequest } from "@/lib/integrations/zoom-webhook";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { readRequestTextWithLimit } from "@/lib/security/request-body";

export const dynamic = "force-dynamic";

const MAX_ZOOM_WEBHOOK_BODY_BYTES = 128 * 1024;
const PUBLIC_WEBHOOK_RATE_LIMIT_SUBJECT = {
  type: "route",
  id: "public",
} as const;

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimitForPolicy(
      "zoomWebhook",
      PUBLIC_WEBHOOK_RATE_LIMIT_SUBJECT,
    );

    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
    }

    const rawBodyResult = await readRequestTextWithLimit(request, MAX_ZOOM_WEBHOOK_BODY_BYTES);

    if (!rawBodyResult.ok) {
      return NextResponse.json(
        { error: "Zoom webhook payload is too large." },
        { status: 413 },
      );
    }

    const result = await processZoomWebhookRequest(createZoomWebhookRepository(), {
      headers: {
        signature: request.headers.get("x-zm-signature"),
        timestamp: request.headers.get("x-zm-request-timestamp"),
      },
      rawBody: rawBodyResult.text,
    });

    return NextResponse.json(result.body, {
      status: result.status,
      headers: result.headers,
    });
  } catch (error) {
    console.error("Failed to process Zoom webhook", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
