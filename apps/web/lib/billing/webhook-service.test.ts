import { describe, expect, it, vi } from "vitest";
import { billingPlans } from "./plans";
import {
  processStripeWebhookEvent,
  verifyStripeWebhookSignature,
  type BillingWebhookRepository,
  type StripeWebhookEvent,
} from "./webhook-service";

function makeRepository(overrides: Partial<BillingWebhookRepository> = {}): BillingWebhookRepository {
  return {
    createVoiceCreditGrant: vi.fn().mockResolvedValue(undefined),
    findUserBillingScope: vi.fn().mockResolvedValue({
      orgId: "org-1",
      userId: "auth-user-1",
    }),
    insertStripeWebhookEvent: vi.fn().mockResolvedValue(true),
    upsertBillingCustomer: vi.fn().mockResolvedValue(undefined),
    upsertBillingSubscription: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("verifyStripeWebhookSignature", () => {
  it("accepts a valid Stripe HMAC signature", () => {
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
    const secret = "whsec_test_secret";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = verifyStripeWebhookSignature.createTestSignature({
      payload,
      secret,
      timestamp,
    });

    expect(verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`, secret)).toBe(true);
  });

  it("rejects a valid Stripe HMAC signature with a stale timestamp", () => {
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
    const secret = "whsec_test_secret";
    const timestamp = "1700000000";
    const signature = verifyStripeWebhookSignature.createTestSignature({
      payload,
      secret,
      timestamp,
    });

    expect(verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`, secret)).toBe(false);
  });

  it("rejects an invalid Stripe HMAC signature", () => {
    expect(
      verifyStripeWebhookSignature(
        JSON.stringify({ id: "evt_1" }),
        "t=1770000000,v1=bad",
        "whsec_test_secret",
      ),
    ).toBe(false);
  });
});

describe("processStripeWebhookEvent", () => {
  it("skips duplicate Stripe events before mutating billing state", async () => {
    const repository = makeRepository({
      insertStripeWebhookEvent: vi.fn().mockResolvedValue(false),
    });
    const event: StripeWebhookEvent = {
      id: "evt_duplicate",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          metadata: { auth_user_id: "auth-user-1", plan: "team" },
          status: "active",
        },
      },
    };

    await expect(processStripeWebhookEvent(repository, event)).resolves.toEqual({
      action: "duplicate",
    });
    expect(repository.upsertBillingSubscription).not.toHaveBeenCalled();
    expect(repository.createVoiceCreditGrant).not.toHaveBeenCalled();
  });

  it("persists subscription state and grants included voice minutes", async () => {
    const repository = makeRepository();
    const event: StripeWebhookEvent = {
      id: "evt_subscription",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          current_period_end: 1772592000,
          current_period_start: 1770000000,
          metadata: { auth_user_id: "auth-user-1", plan: "team" },
          status: "active",
          cancel_at_period_end: false,
          items: { data: [{ quantity: 4 }] },
        },
      },
    };

    await expect(processStripeWebhookEvent(repository, event)).resolves.toEqual({
      action: "processed",
    });
    expect(repository.upsertBillingCustomer).toHaveBeenCalledWith({
      orgId: "org-1",
      stripeCustomerId: "cus_1",
      userId: "auth-user-1",
    });
    expect(repository.upsertBillingSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        billingPlanId: "team",
        seatCount: 4,
        status: "active",
        stripeSubscriptionId: "sub_1",
      }),
    );
    expect(repository.createVoiceCreditGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        billingPlanId: "team",
        minutesGranted: 480,
        sourceId: "sub_1:1770000000",
        sourceType: "subscription_included",
      }),
    );
  });

  it("grants one-time extra voice packs from checkout completion", async () => {
    const repository = makeRepository();
    const event: StripeWebhookEvent = {
      id: "evt_extra_pack",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          client_reference_id: "auth-user-1",
          mode: "payment",
          metadata: { auth_user_id: "auth-user-1", plan: "extra-500" },
          payment_intent: "pi_1",
        },
      },
    };

    await processStripeWebhookEvent(repository, event);

    expect(repository.createVoiceCreditGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        billingPlanId: "extra-500",
        minutesGranted: Number(billingPlans["extra-500"].metadata.extra_live_voice_minutes),
        sourceId: "pi_1",
        sourceType: "extra_pack",
      }),
    );
  });
});
