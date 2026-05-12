import { NextResponse } from "next/server";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import {
  processStripeWebhookEvent,
  verifyStripeWebhookSignature,
  type StripeWebhookEvent,
} from "@/lib/billing/webhook-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const payload = await request.text();
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
