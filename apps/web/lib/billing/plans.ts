export type BillingPlanId =
  | "solo"
  | "solo-annual"
  | "team"
  | "team-annual"
  | "extra-250"
  | "extra-500"
  | "extra-2000";

type BillingMode = "payment" | "subscription";
type BillingInterval = "month" | "year";

type BillingPlanPrice = {
  currency: "usd";
  recurring?: {
    interval: BillingInterval;
    intervalCount: number;
  };
  unitAmountCents: number;
};

export type BillingPlan = {
  adjustableQuantity?: {
    enabled: boolean;
    maximum?: number;
    minimum: number;
  };
  defaultQuantity: number;
  id: BillingPlanId;
  lookupKey: string;
  metadata: Record<string, string>;
  mode: BillingMode;
  name: string;
  price: BillingPlanPrice;
  priceIdEnvKey: string;
};

type BillingCheckoutHrefOptions = {
  seats?: number;
};

export const billingPlans: Record<BillingPlanId, BillingPlan> = {
  solo: {
    defaultQuantity: 1,
    id: "solo",
    lookupKey: "argos_solo_monthly",
    metadata: {
      included_live_voice_minutes: "120",
      plan: "solo",
    },
    mode: "subscription",
    name: "Argos Solo",
    price: {
      currency: "usd",
      recurring: {
        interval: "month",
        intervalCount: 1,
      },
      unitAmountCents: 7900,
    },
    priceIdEnvKey: "STRIPE_ARGOS_SOLO_MONTHLY_PRICE_ID",
  },
  "solo-annual": {
    defaultQuantity: 1,
    id: "solo-annual",
    lookupKey: "argos_solo_annual",
    metadata: {
      billing_interval: "year",
      included_live_voice_minutes: "120",
      plan: "solo",
    },
    mode: "subscription",
    name: "Argos Solo Annual",
    price: {
      currency: "usd",
      recurring: {
        interval: "year",
        intervalCount: 1,
      },
      unitAmountCents: 85320,
    },
    priceIdEnvKey: "STRIPE_ARGOS_SOLO_ANNUAL_PRICE_ID",
  },
  team: {
    adjustableQuantity: {
      enabled: true,
      minimum: 3,
    },
    defaultQuantity: 3,
    id: "team",
    lookupKey: "argos_paid_seat_monthly",
    metadata: {
      billing_scope: "org_pool",
      included_live_voice_minutes_per_seat: "120",
      minimum_seats: "3",
      plan: "team",
    },
    mode: "subscription",
    name: "Argos Team",
    price: {
      currency: "usd",
      recurring: {
        interval: "month",
        intervalCount: 1,
      },
      unitAmountCents: 5000,
    },
    priceIdEnvKey: "STRIPE_ARGOS_TEAM_MONTHLY_PRICE_ID",
  },
  "team-annual": {
    adjustableQuantity: {
      enabled: true,
      minimum: 3,
    },
    defaultQuantity: 3,
    id: "team-annual",
    lookupKey: "argos_paid_seat_annual",
    metadata: {
      billing_interval: "year",
      billing_scope: "org_pool",
      included_live_voice_minutes_per_seat: "120",
      minimum_seats: "3",
      plan: "team",
    },
    mode: "subscription",
    name: "Argos Team Annual",
    price: {
      currency: "usd",
      recurring: {
        interval: "year",
        intervalCount: 1,
      },
      unitAmountCents: 54000,
    },
    priceIdEnvKey: "STRIPE_ARGOS_TEAM_ANNUAL_PRICE_ID",
  },
  "extra-250": {
    defaultQuantity: 1,
    id: "extra-250",
    lookupKey: "argos_extra_minutes_250",
    metadata: {
      extra_live_voice_minutes: "250",
      plan: "extra-250",
    },
    mode: "payment",
    name: "250 extra Argos live voice minutes",
    price: {
      currency: "usd",
      unitAmountCents: 12500,
    },
    priceIdEnvKey: "STRIPE_ARGOS_EXTRA_250_PRICE_ID",
  },
  "extra-500": {
    defaultQuantity: 1,
    id: "extra-500",
    lookupKey: "argos_extra_minutes_500",
    metadata: {
      extra_live_voice_minutes: "500",
      plan: "extra-500",
    },
    mode: "payment",
    name: "500 extra Argos live voice minutes",
    price: {
      currency: "usd",
      unitAmountCents: 17500,
    },
    priceIdEnvKey: "STRIPE_ARGOS_EXTRA_500_PRICE_ID",
  },
  "extra-2000": {
    defaultQuantity: 1,
    id: "extra-2000",
    lookupKey: "argos_extra_minutes_2000",
    metadata: {
      extra_live_voice_minutes: "2000",
      plan: "extra-2000",
    },
    mode: "payment",
    name: "2,000 extra Argos live voice minutes",
    price: {
      currency: "usd",
      unitAmountCents: 60000,
    },
    priceIdEnvKey: "STRIPE_ARGOS_EXTRA_2000_PRICE_ID",
  },
};

export function getBillingPlan(planId: string | null): BillingPlan | null {
  if (!planId || !(planId in billingPlans)) {
    return null;
  }

  return billingPlans[planId as BillingPlanId];
}

export function getBillingPlanQuantity(
  plan: BillingPlan,
  requestedQuantity?: number | null,
): number {
  if (!plan.adjustableQuantity) {
    return plan.defaultQuantity;
  }

  if (!Number.isFinite(requestedQuantity)) {
    return plan.defaultQuantity;
  }

  const quantity = Math.floor(Number(requestedQuantity));
  const minimum = plan.adjustableQuantity.minimum;
  const maximum = plan.adjustableQuantity.maximum;

  if (quantity < minimum) {
    return minimum;
  }

  if (maximum && quantity > maximum) {
    return maximum;
  }

  return quantity;
}

export function getBillingCheckoutHref(
  planId: BillingPlanId,
  options: BillingCheckoutHrefOptions = {},
): string {
  const params = new URLSearchParams();
  params.set("plan", planId);

  const plan = getBillingPlan(planId);
  if (plan?.adjustableQuantity && options.seats !== undefined) {
    params.set("seats", String(getBillingPlanQuantity(plan, options.seats)));
  }

  return `/billing/checkout?${params.toString()}`;
}
