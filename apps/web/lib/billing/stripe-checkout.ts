import type { BillingPlan } from "./plans";

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
  data?: Array<{
    id?: string;
  }>;
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
  successUrl: string;
};

export async function createStripeCheckoutSession({
  authUserId,
  cancelUrl,
  customerEmail,
  env = process.env,
  fetcher = fetch,
  plan,
  successUrl,
}: CreateStripeCheckoutSessionInput) {
  const secretKey = getStripeSecretKey(env);
  const priceId = await resolveStripePriceId({
    env,
    fetcher,
    plan,
    secretKey,
  });
  const body = new URLSearchParams();

  body.set("mode", plan.mode);
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("client_reference_id", authUserId);
  body.set("line_items[0][price]", priceId);
  body.set("line_items[0][quantity]", String(plan.defaultQuantity));
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

async function resolveStripePriceId({
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
    return configuredPriceId;
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
  const priceId = payload.data?.[0]?.id;

  if (!priceId) {
    throw new StripeCheckoutConfigurationError(
      `No active Stripe price found for lookup key: ${plan.lookupKey}`,
    );
  }

  return priceId;
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
