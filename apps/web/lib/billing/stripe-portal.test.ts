import { describe, expect, it, vi } from "vitest";
import {
  createStripeBillingPortalSession,
  StripeBillingPortalConfigurationError,
} from "./stripe-portal";

describe("createStripeBillingPortalSession", () => {
  it("creates a billing portal session for the signed-in customer's email", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: "cus_argos_123" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "bps_123",
          url: "https://billing.stripe.com/p/session",
        }),
      );

    const session = await createStripeBillingPortalSession({
      customerEmail: "founder@argos.ai",
      env: {
        STRIPE_SECRET_KEY: "sk_live_test",
      },
      fetcher,
      returnUrl: "https://argos.ai/settings",
    });

    expect(session.url).toBe("https://billing.stripe.com/p/session");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://api.stripe.com/v1/customers?email=founder%40argos.ai&limit=1",
    );

    const portalBody = fetcher.mock.calls[1]?.[1]?.body as URLSearchParams;
    expect(portalBody.get("customer")).toBe("cus_argos_123");
    expect(portalBody.get("return_url")).toBe("https://argos.ai/settings");
  });

  it("throws a configuration error when no Stripe customer exists for the user", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] }));

    await expect(
      createStripeBillingPortalSession({
        customerEmail: "founder@argos.ai",
        env: {
          STRIPE_SECRET_KEY: "sk_live_test",
        },
        fetcher,
        returnUrl: "https://argos.ai/settings",
      }),
    ).rejects.toBeInstanceOf(StripeBillingPortalConfigurationError);
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
