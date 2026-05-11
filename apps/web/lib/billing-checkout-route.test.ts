import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StripeCheckoutConfigurationError } from "./billing/stripe-checkout";

const { createStripeCheckoutSession, getAuthenticatedSupabaseUser } = vi.hoisted(() => ({
  createStripeCheckoutSession: vi.fn(),
  getAuthenticatedSupabaseUser: vi.fn(),
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/billing/stripe-checkout", async () => {
  const actual = await vi.importActual<typeof import("./billing/stripe-checkout")>(
    "@/lib/billing/stripe-checkout",
  );

  return {
    ...actual,
    createStripeCheckoutSession,
  };
});

describe("billing checkout route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    getAuthenticatedSupabaseUser.mockReset();
    createStripeCheckoutSession.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects unauthenticated users to login with the checkout URL as next", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue(null);

    const route = await import("../app/billing/checkout/route");
    const response = await route.GET(new Request("https://argos.ai/billing/checkout?plan=team&seats=8"));

    expect(response.headers.get("location")).toBe(
      "https://argos.ai/login?next=%2Fbilling%2Fcheckout%3Fplan%3Dteam%26seats%3D8",
    );
    expect(createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it("uses the hardened site origin for unauthenticated checkout redirects in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");
    getAuthenticatedSupabaseUser.mockResolvedValue(null);

    const route = await import("../app/billing/checkout/route");
    const response = await route.GET(
      new Request("https://evil.example/billing/checkout?plan=solo", {
        headers: {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.argos.ai/login?next=%2Fbilling%2Fcheckout%3Fplan%3Dsolo",
    );
    expect(createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it("creates a Stripe checkout session for authenticated plan checkout", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({
      email: "founder@argos.ai",
      id: "auth-user-1",
    });
    createStripeCheckoutSession.mockResolvedValue({
      id: "cs_live",
      url: "https://checkout.stripe.com/c/live-session",
    });

    const route = await import("../app/billing/checkout/route");
    const response = await route.GET(new Request("https://argos.ai/billing/checkout?plan=team&seats=8"));

    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/c/live-session");
    expect(createStripeCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: "auth-user-1",
        cancelUrl: "https://argos.ai/?checkout=cancelled&plan=team#access",
        customerEmail: "founder@argos.ai",
        plan: expect.objectContaining({ id: "team" }),
        quantity: 8,
        successUrl: "https://argos.ai/dashboard?checkout=success&plan=team",
      }),
    );
  });

  it("returns users to pricing when the plan is invalid", async () => {
    const route = await import("../app/billing/checkout/route");
    const response = await route.GET(new Request("https://argos.ai/billing/checkout?plan=missing"));

    expect(response.headers.get("location")).toBe(
      "https://argos.ai/?checkout_error=invalid_plan#access",
    );
  });

  it("returns users to pricing when Stripe is not configured", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({
      email: "founder@argos.ai",
      id: "auth-user-1",
    });
    createStripeCheckoutSession.mockRejectedValue(
      new StripeCheckoutConfigurationError("Missing required environment variable: STRIPE_SECRET_KEY"),
    );

    const route = await import("../app/billing/checkout/route");
    const response = await route.GET(new Request("https://argos.ai/billing/checkout?plan=solo"));

    expect(response.headers.get("location")).toBe(
      "https://argos.ai/?checkout_error=stripe_not_configured&plan=solo#access",
    );
  });
});
