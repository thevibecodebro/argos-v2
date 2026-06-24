import { describe, expect, it, vi } from "vitest";
import {
  createStripeBillingPortalSession,
  StripeBillingPortalConfigurationError,
} from "./stripe-portal";

describe("createStripeBillingPortalSession", () => {
  it("creates a billing portal session for a locally bound customer id", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: "bpc_argos_safe",
          features: {
            subscription_update: {
              default_allowed_updates: ["price", "quantity"],
              enabled: true,
              proration_behavior: "always_invoice",
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "bps_123",
          url: "https://billing.stripe.com/p/session",
        }),
      );

    const session = await createStripeBillingPortalSession({
      customerId: "cus_argos_123",
      env: {
        STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID: "bpc_argos_safe",
        STRIPE_SECRET_KEY: "sk_live_test",
      },
      fetcher,
      returnUrl: "https://argos.ai/settings",
    });

    expect(session.url).toBe("https://billing.stripe.com/p/session");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://api.stripe.com/v1/billing_portal/configurations/bpc_argos_safe",
    );

    const portalBody = fetcher.mock.calls[1]?.[1]?.body as URLSearchParams;
    expect(portalBody.get("customer")).toBe("cus_argos_123");
    expect(portalBody.get("configuration")).toBe("bpc_argos_safe");
    expect(portalBody.get("return_url")).toBe("https://argos.ai/settings");
  });

  it("rejects portal configurations that do not invoice prorated seat upgrades", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: "bpc_argos_unsafe",
          features: {
            subscription_update: {
              default_allowed_updates: ["quantity"],
              enabled: true,
              proration_behavior: "none",
            },
          },
        }),
      );

    await expect(
      createStripeBillingPortalSession({
        customerId: "cus_argos_123",
        env: {
          STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID: "bpc_argos_unsafe",
          STRIPE_SECRET_KEY: "sk_live_test",
        },
        fetcher,
        returnUrl: "https://argos.ai/settings",
      }),
    ).rejects.toBeInstanceOf(StripeBillingPortalConfigurationError);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("requires an explicit portal configuration before opening seat management", async () => {
    const fetcher = vi.fn();

    await expect(
      createStripeBillingPortalSession({
        customerId: "cus_argos_123",
        env: {
          STRIPE_SECRET_KEY: "sk_live_test",
        },
        fetcher,
        returnUrl: "https://argos.ai/settings",
      }),
    ).rejects.toBeInstanceOf(StripeBillingPortalConfigurationError);

    expect(fetcher).not.toHaveBeenCalled();
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
