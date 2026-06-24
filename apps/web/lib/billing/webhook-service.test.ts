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
      email: "owner@acme.com",
      fullName: "Ada Owner",
      orgName: "Acme Revenue",
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
    const timestamp = "1770000000";
    const signature = verifyStripeWebhookSignature.createTestSignature({
      payload,
      secret,
      timestamp,
    });

    expect(verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`, secret)).toBe(true);
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

  it("sends onboarding email to the billing owner after subscription checkout completes", async () => {
    const repository = makeRepository();
    const sendOnboardingEmail = vi.fn().mockResolvedValue({ id: "email-1" });
    const event: StripeWebhookEvent = {
      id: "evt_checkout_subscription",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          client_reference_id: "auth-user-1",
          mode: "subscription",
          metadata: { auth_user_id: "auth-user-1", plan: "team" },
          subscription: "sub_1",
        },
      },
    };

    await expect(
      processStripeWebhookEvent(repository, event, { sendOnboardingEmail }),
    ).resolves.toEqual({
      action: "processed",
    });

    expect(repository.upsertBillingCustomer).toHaveBeenCalledWith({
      orgId: "org-1",
      stripeCustomerId: "cus_1",
      userId: "auth-user-1",
    });
    expect(sendOnboardingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        checkoutSessionId: "cs_1",
        email: "owner@acme.com",
        fullName: "Ada Owner",
        orgName: "Acme Revenue",
        plan: billingPlans.team,
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
      }),
    );
  });

  it("does not fail paid access when onboarding email delivery fails", async () => {
    const repository = makeRepository();
    const sendOnboardingEmail = vi.fn().mockRejectedValue(new Error("Resend is unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const event: StripeWebhookEvent = {
      id: "evt_checkout_email_failure",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          client_reference_id: "auth-user-1",
          mode: "subscription",
          metadata: { auth_user_id: "auth-user-1", plan: "solo" },
          subscription: "sub_1",
        },
      },
    };

    try {
      await expect(
        processStripeWebhookEvent(repository, event, { sendOnboardingEmail }),
      ).resolves.toEqual({
        action: "processed",
      });

      expect(repository.upsertBillingCustomer).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to send billing onboarding email",
        expect.any(Error),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("grants one-time extra voice packs from paid checkout completion", async () => {
    const repository = makeRepository();
    const sendOnboardingEmail = vi.fn();
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
          payment_status: "paid",
          status: "complete",
          payment_intent: "pi_1",
        },
      },
    };

    await processStripeWebhookEvent(repository, event, { sendOnboardingEmail });

    expect(repository.createVoiceCreditGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        billingPlanId: "extra-500",
        minutesGranted: Number(billingPlans["extra-500"].metadata.extra_live_voice_minutes),
        sourceId: "pi_1",
        sourceType: "extra_pack",
      }),
    );
    expect(sendOnboardingEmail).not.toHaveBeenCalled();
  });

  it("does not grant one-time extra voice packs from unpaid checkout completion", async () => {
    const repository = makeRepository();
    const event: StripeWebhookEvent = {
      id: "evt_unpaid_extra_pack",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          client_reference_id: "auth-user-1",
          mode: "payment",
          metadata: { auth_user_id: "auth-user-1", plan: "extra-500" },
          payment_status: "unpaid",
          payment_intent: "pi_1",
          status: "complete",
        },
      },
    };

    await expect(processStripeWebhookEvent(repository, event)).resolves.toEqual({
      action: "processed",
    });
    expect(repository.findUserBillingScope).not.toHaveBeenCalled();
    expect(repository.upsertBillingCustomer).not.toHaveBeenCalled();
    expect(repository.createVoiceCreditGrant).not.toHaveBeenCalled();
  });

  it("does not grant one-time extra voice packs without a settled payment intent", async () => {
    const repository = makeRepository();
    const event: StripeWebhookEvent = {
      id: "evt_missing_payment_intent",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          client_reference_id: "auth-user-1",
          mode: "payment",
          metadata: { auth_user_id: "auth-user-1", plan: "extra-500" },
          payment_status: "paid",
          status: "complete",
        },
      },
    };

    await expect(processStripeWebhookEvent(repository, event)).resolves.toEqual({
      action: "processed",
    });
    expect(repository.findUserBillingScope).not.toHaveBeenCalled();
    expect(repository.upsertBillingCustomer).not.toHaveBeenCalled();
    expect(repository.createVoiceCreditGrant).not.toHaveBeenCalled();
  });

  it("grants one-time extra voice packs after asynchronous payment succeeds", async () => {
    const repository = makeRepository();
    const event: StripeWebhookEvent = {
      id: "evt_async_paid_extra_pack",
      type: "checkout.session.async_payment_succeeded",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          client_reference_id: "auth-user-1",
          mode: "payment",
          metadata: { auth_user_id: "auth-user-1", plan: "extra-250" },
          payment_status: "paid",
          payment_intent: "pi_async_1",
          status: "complete",
        },
      },
    };

    await expect(processStripeWebhookEvent(repository, event)).resolves.toEqual({
      action: "processed",
    });
    expect(repository.createVoiceCreditGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        billingPlanId: "extra-250",
        minutesGranted: Number(billingPlans["extra-250"].metadata.extra_live_voice_minutes),
        sourceId: "pi_async_1",
        sourceType: "extra_pack",
      }),
    );
  });
});
