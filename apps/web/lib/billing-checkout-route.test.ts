import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StripeCheckoutConfigurationError } from "./billing/stripe-checkout";
import type { CurrentUserDetails } from "./users/service";

const {
  createStripeCheckoutSession,
  createUsersRepository,
  getAuthenticatedSupabaseUser,
  getCurrentUserDetails,
} = vi.hoisted(() => ({
  createStripeCheckoutSession: vi.fn(),
  createUsersRepository: vi.fn(),
  getAuthenticatedSupabaseUser: vi.fn(),
  getCurrentUserDetails: vi.fn(),
}));

const checkRateLimitForPolicy = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/users/service", () => ({
  getCurrentUserDetails,
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

vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy,
  rateLimitExceededResponse: (result: { retryAfterSeconds: number }) =>
    Response.json(
      {
        code: "rate_limit_exceeded",
        error: "Too many requests. Try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    ),
}));

describe("billing checkout route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    getAuthenticatedSupabaseUser.mockReset();
    createUsersRepository.mockReset();
    getCurrentUserDetails.mockReset();
    createStripeCheckoutSession.mockReset();
    checkRateLimitForPolicy.mockReset();
    createUsersRepository.mockReturnValue({ usersRepository: true });
    getCurrentUserDetails.mockResolvedValue({
      ok: true,
      data: currentUser(),
    });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      bucketKey: "billingCheckout:user:hash",
      limit: 10,
      remaining: 9,
      requestCount: 1,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 3600,
    });
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

  it("blocks non-admin organization members before rate limiting or Stripe checkout", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({
      email: "rep@argos.ai",
      id: "auth-user-2",
    });
    getCurrentUserDetails.mockResolvedValue({
      ok: true,
      data: currentUser({
        email: "rep@argos.ai",
        id: "auth-user-2",
        role: "rep",
      }),
    });
    createStripeCheckoutSession.mockResolvedValue({
      id: "cs_live",
      url: "https://checkout.stripe.com/c/live-session",
    });

    const route = await import("../app/billing/checkout/route");
    const response = await route.GET(new Request("https://argos.ai/billing/checkout?plan=team&seats=8"));

    expect(response.headers.get("location")).toBe(
      "https://argos.ai/?checkout_error=admin_required&plan=team#access",
    );
    expect(checkRateLimitForPolicy).not.toHaveBeenCalled();
    expect(createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it("rate limits checkout session creation per authenticated user before calling Stripe", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({
      email: "founder@argos.ai",
      id: "auth-user-1",
    });
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      bucketKey: "billingCheckout:user:hash",
      limit: 10,
      remaining: 0,
      requestCount: 11,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 321,
    });

    const route = await import("../app/billing/checkout/route");
    const response = await route.GET(new Request("https://argos.ai/billing/checkout?plan=team&seats=8"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("321");
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("billingCheckout", {
      type: "user",
      id: "auth-user-1",
    });
    expect(createStripeCheckoutSession).not.toHaveBeenCalled();
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

function currentUser(overrides: Partial<CurrentUserDetails> = {}): CurrentUserDetails {
  return {
    id: "auth-user-1",
    email: "founder@argos.ai",
    firstName: "Jared",
    lastName: "Newman",
    profileImageUrl: null,
    role: "admin",
    orgId: "org-1",
    displayNameSet: true,
    org: {
      id: "org-1",
      name: "Argos",
      slug: "argos",
      plan: "team",
      logoUrl: null,
      workspaceTheme: null,
      createdAt: "2026-04-03T00:00:00.000Z",
    },
    ...overrides,
  };
}
