import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyStripeWebhookSignature } from "./billing/webhook-service";

const { processStripeWebhookEvent, DrizzleBillingRepository } = vi.hoisted(() => ({
  processStripeWebhookEvent: vi.fn(),
  DrizzleBillingRepository: vi.fn(function MockBillingRepository(this: unknown) {
    return { mocked: true };
  }),
}));

vi.mock("@/lib/billing/repository", () => ({
  DrizzleBillingRepository,
}));

vi.mock("@/lib/billing/webhook-service", async () => {
  const actual = await vi.importActual<typeof import("./billing/webhook-service")>(
    "@/lib/billing/webhook-service",
  );

  return {
    ...actual,
    processStripeWebhookEvent,
  };
});

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    processStripeWebhookEvent.mockReset();
    DrizzleBillingRepository.mockClear();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects invalid signatures before processing", async () => {
    const route = await import("../app/api/webhooks/stripe/route");
    const response = await route.POST(
      new Request("https://argos.ai/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "t=1770000000,v1=bad",
        },
        body: JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(processStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies before signature verification or processing", async () => {
    const route = await import("../app/api/webhooks/stripe/route");
    const request = new Request("https://argos.ai/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "Content-Length": "200000",
        "Content-Type": "application/json",
        "stripe-signature": "t=1770000000,v1=bad",
      },
      body: JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }),
    });
    const textSpy = vi.spyOn(request, "text");
    const response = await route.POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Request body too large.",
    });
    expect(textSpy).not.toHaveBeenCalled();
    expect(processStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it("processes valid Stripe webhook events", async () => {
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    const timestamp = "1770000000";
    const signature = verifyStripeWebhookSignature.createTestSignature({
      payload,
      secret: "whsec_test_secret",
      timestamp,
    });
    processStripeWebhookEvent.mockResolvedValue({ action: "processed" });

    const route = await import("../app/api/webhooks/stripe/route");
    const response = await route.POST(
      new Request("https://argos.ai/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": `t=${timestamp},v1=${signature}`,
        },
        body: payload,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: "processed",
      received: true,
    });
    expect(DrizzleBillingRepository).toHaveBeenCalledTimes(1);
    expect(processStripeWebhookEvent).toHaveBeenCalledWith(
      { mocked: true },
      { id: "evt_1", type: "checkout.session.completed", data: { object: {} } },
    );
  });
});
