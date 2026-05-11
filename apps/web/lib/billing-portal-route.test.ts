import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StripeBillingPortalConfigurationError } from "./billing/stripe-portal";

const { createStripeBillingPortalSession, getAuthenticatedSupabaseUser } = vi.hoisted(() => ({
  createStripeBillingPortalSession: vi.fn(),
  getAuthenticatedSupabaseUser: vi.fn(),
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/billing/stripe-portal", async () => {
  const actual = await vi.importActual<typeof import("./billing/stripe-portal")>(
    "@/lib/billing/stripe-portal",
  );

  return {
    ...actual,
    createStripeBillingPortalSession,
  };
});

describe("billing portal route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    getAuthenticatedSupabaseUser.mockReset();
    createStripeBillingPortalSession.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects unauthenticated users to login with the portal URL as next", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue(null);

    const route = await import("../app/billing/portal/route");
    const response = await route.GET(new Request("https://argos.ai/billing/portal"));

    expect(response.headers.get("location")).toBe(
      "https://argos.ai/login?next=%2Fbilling%2Fportal",
    );
    expect(createStripeBillingPortalSession).not.toHaveBeenCalled();
  });

  it("creates a Stripe portal session for authenticated account billing", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({
      email: "founder@argos.ai",
      id: "auth-user-1",
    });
    createStripeBillingPortalSession.mockResolvedValue({
      id: "bps_live",
      url: "https://billing.stripe.com/p/session",
    });

    const route = await import("../app/billing/portal/route");
    const response = await route.GET(new Request("https://argos.ai/billing/portal"));

    expect(response.headers.get("location")).toBe("https://billing.stripe.com/p/session");
    expect(createStripeBillingPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "founder@argos.ai",
        returnUrl: "https://argos.ai/settings",
      }),
    );
  });

  it("returns users to settings when the authenticated account has no email", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({
      id: "auth-user-1",
    });

    const route = await import("../app/billing/portal/route");
    const response = await route.GET(new Request("https://argos.ai/billing/portal"));

    expect(response.headers.get("location")).toBe(
      "https://argos.ai/settings?billing_error=portal_not_available",
    );
    expect(createStripeBillingPortalSession).not.toHaveBeenCalled();
  });

  it("returns users to settings when Stripe portal cannot be opened", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({
      email: "founder@argos.ai",
      id: "auth-user-1",
    });
    createStripeBillingPortalSession.mockRejectedValue(
      new StripeBillingPortalConfigurationError("No Stripe customer found for founder@argos.ai"),
    );

    const route = await import("../app/billing/portal/route");
    const response = await route.GET(new Request("https://argos.ai/billing/portal"));

    expect(response.headers.get("location")).toBe(
      "https://argos.ai/settings?billing_error=portal_not_available",
    );
  });
});
