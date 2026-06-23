import { NextResponse } from "next/server";
import { createGhlWebhookRepository } from "@/lib/integrations/create-ghl-webhook-repository";
import { processGhlWebhookRequest } from "@/lib/integrations/ghl-webhook";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { readRequestTextWithLimit } from "@/lib/security/request-body";

const MAX_GHL_WEBHOOK_BODY_BYTES = 128 * 1024;

export async function processGhlWebhookPost(request: Request, token: string | null) {
  try {
    const rateLimit = await checkRateLimitForPolicy("ghlWebhook", {
      type: "ip",
      id: getWebhookClientIp(request),
    });

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
