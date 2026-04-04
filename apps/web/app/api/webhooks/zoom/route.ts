import { NextResponse } from "next/server";
import { createZoomWebhookRepository } from "@/lib/integrations/create-zoom-webhook-repository";
import { processZoomWebhookRequest } from "@/lib/integrations/zoom-webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await processZoomWebhookRequest(createZoomWebhookRepository(), {
      headers: {
        signature: request.headers.get("x-zm-signature"),
        timestamp: request.headers.get("x-zm-request-timestamp"),
      },
      rawBody,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Failed to process Zoom webhook", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
