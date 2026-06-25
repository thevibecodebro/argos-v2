import { createHmac, timingSafeEqual } from "node:crypto";
import {
  sendBillingOnboardingEmail,
  type SendBillingOnboardingEmailInput,
} from "./onboarding-email";
import { billingPlans, getBillingPlan, type BillingPlanId } from "./plans";

type StripeMetadata = Record<string, string | undefined>;

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export type BillingScope = {
  email: string;
  fullName: string | null;
  orgName: string | null;
  orgId: string | null;
  userId: string;
};

type BillingOnboardingEmailSender = (
  input: SendBillingOnboardingEmailInput,
) => Promise<unknown>;

type ProcessStripeWebhookEventOptions = {
  sendOnboardingEmail?: BillingOnboardingEmailSender;
};

const STRIPE_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type BillingWebhookRepository = {
  createVoiceCreditGrant(input: {
    billingPlanId: BillingPlanId;
    expiresAt: Date | null;
    minutesGranted: number;
    orgId: string | null;
    periodEnd: Date | null;
    periodStart: Date | null;
    sourceId: string;
    sourceType: "subscription_included" | "extra_pack";
    userId: string;
  }): Promise<void>;
  findUserBillingScope(authUserId: string): Promise<BillingScope | null>;
  insertStripeWebhookEvent(input: {
    eventId: string;
    eventType: string;
    payload: StripeWebhookEvent;
  }): Promise<boolean>;
  reconcileSubscriptionVoiceCreditGrants(input: {
    active: boolean;
    billingPlanId: BillingPlanId;
    expiresAt: Date | null;
    minutesGranted: number;
    orgId: string | null;
    periodEnd: Date | null;
    periodStart: Date | null;
    sourceId: string;
    stripeSubscriptionId: string;
    userId: string;
  }): Promise<void>;
  upsertBillingCustomer(input: {
    orgId: string | null;
    stripeCustomerId: string;
    userId: string;
  }): Promise<void>;
  upsertBillingSubscription(input: {
    billingPlanId: BillingPlanId;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
    orgId: string | null;
    seatCount: number;
    status: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    userId: string;
  }): Promise<void>;
};

function createStripeSignature(payload: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
}

export const verifyStripeWebhookSignature = Object.assign(
  function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null, secret: string) {
    if (!signatureHeader || !secret) {
      return false;
    }

    const parts = new Map(
      signatureHeader
        .split(",")
        .map((part) => part.split("=") as [string, string])
        .filter(([key, value]) => key && value),
    );
    const timestamp = parts.get("t");
    const signature = parts.get("v1");

    if (!timestamp || !signature) {
      return false;
    }

    if (!isStripeWebhookTimestampFresh(timestamp)) {
      return false;
    }

    const expected = createStripeSignature(payload, timestamp, secret);
    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    return (
      expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer)
    );
  },
  {
    createTestSignature(input: { payload: string; secret: string; timestamp: string }) {
      return createStripeSignature(input.payload, input.timestamp, input.secret);
    },
  },
);

function isStripeWebhookTimestampFresh(timestamp: string) {
  const timestampSeconds = Number(timestamp);

  if (!Number.isSafeInteger(timestampSeconds) || timestampSeconds <= 0) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const skewSeconds = Math.abs(nowSeconds - timestampSeconds);

  return skewSeconds <= STRIPE_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS;
}

export async function processStripeWebhookEvent(
  repository: BillingWebhookRepository,
  event: StripeWebhookEvent,
  options: ProcessStripeWebhookEventOptions = {},
) {
  const sendOnboardingEmail = options.sendOnboardingEmail ?? sendBillingOnboardingEmail;
  const inserted = await repository.insertStripeWebhookEvent({
    eventId: event.id,
    eventType: event.type,
    payload: event,
  });

  if (!inserted) {
    return { action: "duplicate" as const };
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    await processSubscriptionEvent(repository, event.data.object);
    return { action: "processed" as const };
  }

  if (event.type === "customer.subscription.deleted") {
    await processSubscriptionEvent(repository, event.data.object);
    return { action: "processed" as const };
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await processCheckoutCompletedEvent(repository, event.data.object, { sendOnboardingEmail });
    return { action: "processed" as const };
  }

  return { action: "ignored" as const };
}

async function processSubscriptionEvent(
  repository: BillingWebhookRepository,
  object: Record<string, unknown>,
) {
  const metadata = getMetadata(object);
  const authUserId = metadata.auth_user_id;
  const plan = getBillingPlan(metadata.plan ?? null);
  const stripeSubscriptionId = getString(object.id);
  const stripeCustomerId = getString(object.customer);

  if (!authUserId || !plan || !stripeSubscriptionId || !stripeCustomerId || plan.mode !== "subscription") {
    return;
  }

  const scope = await repository.findUserBillingScope(authUserId);

  if (!scope) {
    return;
  }

  const periodStart = getUnixDate(object.current_period_start);
  const periodEnd = getUnixDate(object.current_period_end);
  const seatCount = Math.max(1, getSubscriptionQuantity(object) ?? plan.defaultQuantity);
  const status = getString(object.status) ?? "unknown";
  const cancelAtPeriodEnd = object.cancel_at_period_end === true;

  await repository.upsertBillingCustomer({
    orgId: scope.orgId,
    stripeCustomerId,
    userId: scope.userId,
  });
  await repository.upsertBillingSubscription({
    billingPlanId: plan.id,
    cancelAtPeriodEnd,
    currentPeriodEnd: periodEnd,
    currentPeriodStart: periodStart,
    orgId: scope.orgId,
    seatCount,
    status,
    stripeCustomerId,
    stripeSubscriptionId,
    userId: scope.userId,
  });

  const subscriptionIsActive = status === "active" || status === "trialing";
  const minutes = subscriptionIsActive ? getIncludedVoiceMinutes(plan.id, seatCount) : 0;

  await repository.reconcileSubscriptionVoiceCreditGrants({
    active: subscriptionIsActive && minutes > 0,
    billingPlanId: plan.id,
    expiresAt: periodEnd,
    minutesGranted: minutes,
    orgId: scope.orgId,
    periodEnd,
    periodStart,
    sourceId: `${stripeSubscriptionId}:${object.current_period_start ?? "current"}`,
    stripeSubscriptionId,
    userId: scope.userId,
  });
}

async function processCheckoutCompletedEvent(
  repository: BillingWebhookRepository,
  object: Record<string, unknown>,
  options: { sendOnboardingEmail: BillingOnboardingEmailSender },
) {
  const metadata = getMetadata(object);
  const authUserId = metadata.auth_user_id ?? getString(object.client_reference_id);
  const plan = getBillingPlan(metadata.plan ?? null);
  const stripeCustomerId = getString(object.customer);
  const paidPaymentIntentId = plan?.mode === "payment"
    ? getPaidOneTimePaymentIntentId(object)
    : null;

  if (!authUserId || !plan || !stripeCustomerId) {
    return;
  }

  if (plan.mode === "payment" && !paidPaymentIntentId) {
    return;
  }

  const scope = await repository.findUserBillingScope(authUserId);

  if (!scope) {
    return;
  }

  await repository.upsertBillingCustomer({
    orgId: scope.orgId,
    stripeCustomerId,
    userId: scope.userId,
  });

  if (plan.mode === "subscription") {
    await sendSubscriptionOnboardingEmail({
      object,
      plan,
      scope,
      sendOnboardingEmail: options.sendOnboardingEmail,
      stripeCustomerId,
    });
    return;
  }

  if (plan.mode !== "payment") {
    return;
  }

  if (!paidPaymentIntentId) {
    return;
  }

  const minutes = Number(plan.metadata.extra_live_voice_minutes ?? 0);

  if (minutes <= 0) {
    return;
  }

  await repository.createVoiceCreditGrant({
    billingPlanId: plan.id,
    expiresAt: null,
    minutesGranted: minutes,
    orgId: scope.orgId,
    periodEnd: null,
    periodStart: null,
    sourceId: paidPaymentIntentId,
    sourceType: "extra_pack",
    userId: scope.userId,
  });
}

async function sendSubscriptionOnboardingEmail({
  object,
  plan,
  scope,
  sendOnboardingEmail,
  stripeCustomerId,
}: {
  object: Record<string, unknown>;
  plan: Exclude<ReturnType<typeof getBillingPlan>, null>;
  scope: BillingScope;
  sendOnboardingEmail: BillingOnboardingEmailSender;
  stripeCustomerId: string;
}) {
  try {
    await sendOnboardingEmail({
      checkoutSessionId: getString(object.id),
      email: scope.email,
      fullName: scope.fullName,
      orgName: scope.orgName,
      plan,
      stripeCustomerId,
      stripeSubscriptionId: getString(object.subscription),
    });
  } catch (error) {
    console.error("Failed to send billing onboarding email", error);
  }
}

function getIncludedVoiceMinutes(planId: BillingPlanId, seatCount: number) {
  const plan = billingPlans[planId];
  const perSeat = Number(plan.metadata.included_live_voice_minutes_per_seat ?? 0);
  const solo = Number(plan.metadata.included_live_voice_minutes ?? 0);

  return perSeat > 0 ? perSeat * seatCount : solo;
}

function getString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function getMetadata(object: Record<string, unknown>): StripeMetadata {
  return object.metadata && typeof object.metadata === "object"
    ? (object.metadata as StripeMetadata)
    : {};
}

function getPaidOneTimePaymentIntentId(object: Record<string, unknown>) {
  if (getString(object.mode) !== "payment") {
    return null;
  }

  if (getString(object.status) !== "complete") {
    return null;
  }

  if (getString(object.payment_status) !== "paid") {
    return null;
  }

  return getString(object.payment_intent);
}

function getUnixDate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000)
    : null;
}

function getSubscriptionQuantity(object: Record<string, unknown>) {
  const items = object.items as { data?: Array<{ quantity?: unknown }> } | undefined;
  const quantity = items?.data?.[0]?.quantity;

  return typeof quantity === "number" && Number.isFinite(quantity) ? quantity : null;
}
