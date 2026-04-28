import { describe, expect, it, vi } from "vitest";
import { billingPlans } from "./plans";
import {
  createStripeCheckoutSession,
  StripeCheckoutConfigurationError,
} from "./stripe-checkout";

describe("createStripeCheckoutSession", () => {
  it("creates a subscription checkout session from a Stripe lookup key", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: "price_team_monthly" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "cs_test",
          url: "https://checkout.stripe.com/c/session",
        }),
      );

    const session = await createStripeCheckoutSession({
      authUserId: "auth-user-1",
      cancelUrl: "https://argos.ai/?checkout=cancelled#access",
      customerEmail: "founder@argos.ai",
      env: {
        STRIPE_SECRET_KEY: "sk_live_test",
      },
      fetcher,
      plan: billingPlans.team,
      successUrl: "https://argos.ai/dashboard?checkout=success",
    });

    expect(session.url).toBe("https://checkout.stripe.com/c/session");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://api.stripe.com/v1/prices?active=true&limit=1&lookup_keys%5B%5D=argos_paid_seat_monthly",
    );

    const checkoutBody = fetcher.mock.calls[1]?.[1]?.body as URLSearchParams;
    expect(checkoutBody.get("mode")).toBe("subscription");
    expect(checkoutBody.get("line_items[0][price]")).toBe("price_team_monthly");
    expect(checkoutBody.get("line_items[0][quantity]")).toBe("3");
    expect(checkoutBody.get("line_items[0][adjustable_quantity][minimum]")).toBe("3");
    expect(checkoutBody.get("customer_email")).toBe("founder@argos.ai");
    expect(checkoutBody.get("subscription_data[metadata][plan]")).toBe("team");
  });

  it("uses an explicit configured price id before lookup keys", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        id: "cs_test",
        url: "https://checkout.stripe.com/c/solo",
      }),
    );

    await createStripeCheckoutSession({
      authUserId: "auth-user-1",
      cancelUrl: "https://argos.ai/#access",
      env: {
        STRIPE_ARGOS_SOLO_MONTHLY_PRICE_ID: "price_live_solo",
        STRIPE_SECRET_KEY: "sk_live_test",
      },
      fetcher,
      plan: billingPlans.solo,
      successUrl: "https://argos.ai/dashboard",
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const checkoutBody = fetcher.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(checkoutBody.get("line_items[0][price]")).toBe("price_live_solo");
  });

  it("throws a configuration error when Stripe is not configured", async () => {
    await expect(
      createStripeCheckoutSession({
        authUserId: "auth-user-1",
        cancelUrl: "https://argos.ai/#access",
        env: {},
        fetcher: vi.fn(),
        plan: billingPlans.solo,
        successUrl: "https://argos.ai/dashboard",
      }),
    ).rejects.toBeInstanceOf(StripeCheckoutConfigurationError);
  });
});

function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
    },
    status: 200,
    ...init,
  });
}
