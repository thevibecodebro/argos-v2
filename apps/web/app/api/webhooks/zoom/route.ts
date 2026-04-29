import { NextResponse } from "next/server";
import { createZoomWebhookRepository } from "@/lib/integrations/create-zoom-webhook-repository";
import { processZoomWebhookRequest } from "@/lib/integrations/zoom-webhook";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";

export const dynamic = "force-dynamic";

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

    const rawBody = await request.text();
    const result = await processZoomWebhookRequest(createZoomWebhookRepository(), {
      headers: {
        signature: request.headers.get("x-zm-signature"),
        timestamp: request.headers.get("x-zm-request-timestamp"),
      },
      rawBody,
    });

    return NextResponse.json(result.body, {
      status: result.status,
      headers: result.headers,
    });
  } catch (error) {
    console.error("Failed to process Zoom webhook", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
