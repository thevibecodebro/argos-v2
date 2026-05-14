import { getBillingPlanQuantity, type BillingPlan } from "./plans";

const STRIPE_API_BASE_URL = "https://api.stripe.com";
const STRIPE_API_VERSION = "2026-02-25.clover";

type EnvSource = Partial<Record<string, string | undefined>>;
type StripeFetch = typeof fetch;

type StripeErrorPayload = {
  error?: {
    message?: string;
  };
};

type StripePriceListPayload = StripeErrorPayload & {
  data?: StripePricePayload[];
};

type StripePricePayload = StripeErrorPayload & {
  active?: boolean;
  currency?: string;
  id?: string;
  recurring?: {
    interval?: string;
    interval_count?: number;
  } | null;
  unit_amount?: number | null;
};

type StripeCheckoutSessionPayload = StripeErrorPayload & {
  id?: string;
  url?: string;
};

export class StripeCheckoutConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeCheckoutConfigurationError";
  }
}

export class StripeCheckoutRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeCheckoutRequestError";
  }
}

export type CreateStripeCheckoutSessionInput = {
  authUserId: string;
  cancelUrl: string;
  customerEmail?: string | null;
  env?: EnvSource;
  fetcher?: StripeFetch;
  plan: BillingPlan;
  quantity?: number | null;
  successUrl: string;
};

export async function createStripeCheckoutSession({
  authUserId,
  cancelUrl,
  customerEmail,
  env = process.env,
  fetcher = fetch,
  plan,
  quantity: requestedQuantity,
  successUrl,
}: CreateStripeCheckoutSessionInput) {
  const secretKey = getStripeSecretKey(env);
  const price = await resolveStripePrice({
    env,
    fetcher,
    plan,
    secretKey,
  });
  const quantity = getBillingPlanQuantity(plan, requestedQuantity);
  const body = new URLSearchParams();

  body.set("mode", plan.mode);
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("client_reference_id", authUserId);
  body.set("line_items[0][price]", price.id);
  body.set("line_items[0][quantity]", String(quantity));
  body.set("metadata[auth_user_id]", authUserId);
  body.set("metadata[plan]", plan.id);

  if (customerEmail) {
    body.set("customer_email", customerEmail);
  }

  for (const [key, value] of Object.entries(plan.metadata)) {
    body.set(`metadata[${key}]`, value);
  }

  if (plan.adjustableQuantity) {
    body.set("line_items[0][adjustable_quantity][enabled]", String(plan.adjustableQuantity.enabled));
    body.set("line_items[0][adjustable_quantity][minimum]", String(plan.adjustableQuantity.minimum));

    if (plan.adjustableQuantity.maximum) {
      body.set("line_items[0][adjustable_quantity][maximum]", String(plan.adjustableQuantity.maximum));
    }
  }

  if (plan.mode === "subscription") {
    body.set("subscription_data[metadata][auth_user_id]", authUserId);
    body.set("subscription_data[metadata][plan]", plan.id);
  } else {
    body.set("payment_intent_data[metadata][auth_user_id]", authUserId);
    body.set("payment_intent_data[metadata][plan]", plan.id);
  }

  const payload = await stripeRequest<StripeCheckoutSessionPayload>({
    body,
    fetcher,
    method: "POST",
    path: "/v1/checkout/sessions",
    secretKey,
  });

  if (!payload.url) {
    throw new StripeCheckoutRequestError("Stripe did not return a checkout URL.");
  }

  return {
    id: payload.id ?? null,
    url: payload.url,
  };
}

function getStripeSecretKey(env: EnvSource) {
  const secretKey = env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new StripeCheckoutConfigurationError("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  return secretKey;
}

async function resolveStripePrice({
  env,
  fetcher,
  plan,
  secretKey,
}: {
  env: EnvSource;
  fetcher: StripeFetch;
  plan: BillingPlan;
  secretKey: string;
}) {
  const configuredPriceId = env[plan.priceIdEnvKey];

  if (configuredPriceId) {
    const price = await stripeRequest<StripePricePayload>({
      fetcher,
      method: "GET",
      path: `/v1/prices/${encodeURIComponent(configuredPriceId)}`,
      secretKey,
    });

    assertStripePriceMatchesPlan(price, plan);
    return price;
  }

  const query = new URLSearchParams();
  query.set("active", "true");
  query.set("limit", "1");
  query.append("lookup_keys[]", plan.lookupKey);

  const payload = await stripeRequest<StripePriceListPayload>({
    fetcher,
    method: "GET",
    path: `/v1/prices?${query.toString()}`,
    secretKey,
  });
  const price = payload.data?.[0];

  if (!price?.id) {
    throw new StripeCheckoutConfigurationError(
      `No active Stripe price found for lookup key: ${plan.lookupKey}`,
    );
  }

  assertStripePriceMatchesPlan(price, plan);
  return price;
}

function assertStripePriceMatchesPlan(price: StripePricePayload, plan: BillingPlan): asserts price is StripePricePayload & { id: string } {
  if (!price.id) {
    throw new StripeCheckoutConfigurationError(`Stripe price for ${plan.id} is missing an id.`);
  }

  if (price.active !== true) {
    throw new StripeCheckoutConfigurationError(`Stripe price ${price.id} for ${plan.id} is not active.`);
  }

  if (price.currency !== plan.price.currency) {
    throw new StripeCheckoutConfigurationError(
      `Stripe price ${price.id} for ${plan.id} must use ${plan.price.currency}.`,
    );
  }

  if (price.unit_amount !== plan.price.unitAmountCents) {
    throw new StripeCheckoutConfigurationError(
      `Stripe price ${price.id} for ${plan.id} must be ${plan.price.unitAmountCents} cents.`,
    );
  }

  const expectedRecurring = plan.price.recurring;

  if (!expectedRecurring) {
    if (price.recurring) {
      throw new StripeCheckoutConfigurationError(
        `Stripe price ${price.id} for ${plan.id} must be one-time, not recurring.`,
      );
    }

    return;
  }

  if (!price.recurring) {
    throw new StripeCheckoutConfigurationError(`Stripe price ${price.id} for ${plan.id} must be recurring.`);
  }

  if (price.recurring.interval !== expectedRecurring.interval) {
    throw new StripeCheckoutConfigurationError(
      `Stripe price ${price.id} for ${plan.id} must recur every ${expectedRecurring.interval}.`,
    );
  }

  if ((price.recurring.interval_count ?? 1) !== expectedRecurring.intervalCount) {
    throw new StripeCheckoutConfigurationError(
      `Stripe price ${price.id} for ${plan.id} must have interval count ${expectedRecurring.intervalCount}.`,
    );
  }
}

async function stripeRequest<TPayload extends StripeErrorPayload>({
  body,
  fetcher,
  method,
  path,
  secretKey,
}: {
  body?: URLSearchParams;
  fetcher: StripeFetch;
  method: "GET" | "POST";
  path: string;
  secretKey: string;
}): Promise<TPayload> {
  const response = await fetcher(`${STRIPE_API_BASE_URL}${path}`, {
    body,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    method,
  });
  const payload = (await response.json().catch(() => ({}))) as TPayload;

  if (!response.ok) {
    throw new StripeCheckoutRequestError(
      payload.error?.message ?? `Stripe request failed with status ${response.status}`,
    );
  }

  return payload;
}
