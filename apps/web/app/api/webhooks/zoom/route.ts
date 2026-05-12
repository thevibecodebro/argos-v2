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

function getWebhookClientIp(request: Request) {
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  const vercelIp = vercelForwardedFor?.split(",")[0]?.trim();

  if (vercelIp) {
    return vercelIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();

  if (forwardedIp) {
    return forwardedIp;
  }

  return "unknown";
}

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimitForPolicy("zoomWebhook", {
      type: "ip",
      id: getWebhookClientIp(request),
    });

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
