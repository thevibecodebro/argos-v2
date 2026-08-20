import { NextResponse } from "next/server";
import { createGhlWebhookRepository } from "@/lib/integrations/create-ghl-webhook-repository";
import { processGhlWebhookRequest } from "@/lib/integrations/ghl-webhook";
import { isGhlIntegrationConfigured } from "@/lib/integrations/service";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { readRequestTextWithLimit } from "@/lib/security/request-body";
import { organizationHasManagedCapability } from "@/lib/access/managed-capabilities-server";

const MAX_GHL_WEBHOOK_BODY_BYTES = 128 * 1024;
const PUBLIC_WEBHOOK_RATE_LIMIT_SUBJECT = {
  type: "route",
  id: "public",
} as const;

export async function processGhlWebhookPost(request: Request, token: string | null) {
  try {
    if (!isGhlIntegrationConfigured()) {
      return NextResponse.json(
        {
          code: "not_configured",
          error: "GoHighLevel integration is not configured",
        },
        { status: 503 },
      );
    }

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
    }, {
      canIngestOrganization: (orgId) =>
        organizationHasManagedCapability(orgId, "integration_ghl"),
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
