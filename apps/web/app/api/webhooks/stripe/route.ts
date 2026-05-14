import { NextResponse } from "next/server";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import {
  processStripeWebhookEvent,
  verifyStripeWebhookSignature,
  type StripeWebhookEvent,
} from "@/lib/billing/webhook-service";
import { readRequestTextWithLimit } from "@/lib/security/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_STRIPE_WEBHOOK_BODY_BYTES = 128 * 1024;

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const payloadResult = await readRequestTextWithLimit(request, MAX_STRIPE_WEBHOOK_BODY_BYTES);

  if (!payloadResult.ok) {
    return NextResponse.json({ error: "Request body too large." }, { status: 413 });
  }

  const payload = payloadResult.text;
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeWebhookSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  let event: StripeWebhookEvent;

  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe payload." }, { status: 400 });
  }

  try {
    const result = await processStripeWebhookEvent(new DrizzleBillingRepository(), event);
    return NextResponse.json({
      received: true,
      action: result.action,
    });
  } catch (error) {
    console.error("Failed to process Stripe webhook", error);
    return NextResponse.json({ error: "Unable to process Stripe webhook." }, { status: 500 });
  }
}
