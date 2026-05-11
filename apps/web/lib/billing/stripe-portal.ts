const STRIPE_API_BASE_URL = "https://api.stripe.com";
const STRIPE_API_VERSION = "2026-02-25.clover";

type EnvSource = Partial<Record<string, string | undefined>>;
type StripeFetch = typeof fetch;

type StripeErrorPayload = {
  error?: {
    message?: string;
  };
};

type StripeCustomerListPayload = StripeErrorPayload & {
  data?: Array<{
    id?: string;
  }>;
};

type StripeBillingPortalSessionPayload = StripeErrorPayload & {
  id?: string;
  url?: string;
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
  customerEmail: string;
  env?: EnvSource;
  fetcher?: StripeFetch;
  returnUrl: string;
};

export async function createStripeBillingPortalSession({
  customerEmail,
  env = process.env,
  fetcher = fetch,
  returnUrl,
}: CreateStripeBillingPortalSessionInput) {
  const secretKey = getStripeSecretKey(env);
  const customerId = await resolveStripeCustomerId({
    customerEmail,
    fetcher,
    secretKey,
  });
  const body = new URLSearchParams();

  body.set("customer", customerId);
  body.set("return_url", returnUrl);

  if (env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID) {
    body.set("configuration", env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID);
  }

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

async function resolveStripeCustomerId({
  customerEmail,
  fetcher,
  secretKey,
}: {
  customerEmail: string;
  fetcher: StripeFetch;
  secretKey: string;
}) {
  const query = new URLSearchParams();
  query.set("email", customerEmail);
  query.set("limit", "1");

  const payload = await stripeRequest<StripeCustomerListPayload>({
    fetcher,
    method: "GET",
    path: `/v1/customers?${query.toString()}`,
    secretKey,
  });
  const customerId = payload.data?.[0]?.id;

  if (!customerId) {
    throw new StripeBillingPortalConfigurationError(`No Stripe customer found for ${customerEmail}`);
  }

  return customerId;
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
