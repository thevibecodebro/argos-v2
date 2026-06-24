const STRIPE_API_BASE_URL = "https://api.stripe.com";
const STRIPE_API_VERSION = "2026-02-25.clover";

type EnvSource = Partial<Record<string, string | undefined>>;
type StripeFetch = typeof fetch;

type StripeErrorPayload = {
  error?: {
    message?: string;
  };
};

type StripeBillingPortalSessionPayload = StripeErrorPayload & {
  id?: string;
  url?: string;
};

type StripeBillingPortalConfigurationPayload = StripeErrorPayload & {
  features?: {
    subscription_update?: {
      default_allowed_updates?: string[];
      enabled?: boolean;
      proration_behavior?: string;
    };
  };
  id?: string;
};

export class StripeBillingPortalConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeBillingPortalConfigurationError";
  }
}

export class StripeBillingPortalRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeBillingPortalRequestError";
  }
}

export type CreateStripeBillingPortalSessionInput = {
  customerId: string;
  env?: EnvSource;
  fetcher?: StripeFetch;
  returnUrl: string;
};

export async function createStripeBillingPortalSession({
  customerId,
  env = process.env,
  fetcher = fetch,
  returnUrl,
}: CreateStripeBillingPortalSessionInput) {
  const secretKey = getStripeSecretKey(env);
  const configurationId = getStripePortalConfigurationId(env);

  await assertStripePortalConfigurationIsSafe({
    configurationId,
    fetcher,
    secretKey,
  });

  const body = new URLSearchParams();

  body.set("customer", customerId);
  body.set("return_url", returnUrl);
  body.set("configuration", configurationId);

  const payload = await stripeRequest<StripeBillingPortalSessionPayload>({
    body,
    fetcher,
    method: "POST",
    path: "/v1/billing_portal/sessions",
    secretKey,
  });

  if (!payload.url) {
    throw new StripeBillingPortalRequestError("Stripe did not return a billing portal URL.");
  }

  return {
    id: payload.id ?? null,
    url: payload.url,
  };
}

function getStripeSecretKey(env: EnvSource) {
  const secretKey = env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new StripeBillingPortalConfigurationError("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  return secretKey;
}

function getStripePortalConfigurationId(env: EnvSource) {
  const configurationId = env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID;

  if (!configurationId) {
    throw new StripeBillingPortalConfigurationError(
      "Missing required environment variable: STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID",
    );
  }

  return configurationId;
}

async function assertStripePortalConfigurationIsSafe({
  configurationId,
  fetcher,
  secretKey,
}: {
  configurationId: string;
  fetcher: StripeFetch;
  secretKey: string;
}) {
  const payload = await stripeRequest<StripeBillingPortalConfigurationPayload>({
    fetcher,
    method: "GET",
    path: `/v1/billing_portal/configurations/${encodeURIComponent(configurationId)}`,
    secretKey,
  });
  const subscriptionUpdate = payload.features?.subscription_update;
  const allowedUpdates = new Set(subscriptionUpdate?.default_allowed_updates ?? []);

  if (subscriptionUpdate?.enabled !== true) {
    throw new StripeBillingPortalConfigurationError(
      `Stripe customer portal configuration ${configurationId} must enable subscription updates.`,
    );
  }

  if (!allowedUpdates.has("price") || !allowedUpdates.has("quantity")) {
    throw new StripeBillingPortalConfigurationError(
      `Stripe customer portal configuration ${configurationId} must allow price and quantity updates.`,
    );
  }

  if (subscriptionUpdate.proration_behavior !== "always_invoice") {
    throw new StripeBillingPortalConfigurationError(
      `Stripe customer portal configuration ${configurationId} must invoice prorated subscription updates.`,
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
    throw new StripeBillingPortalRequestError(
      payload.error?.message ?? `Stripe request failed with status ${response.status}`,
    );
  }

  return payload;
}
