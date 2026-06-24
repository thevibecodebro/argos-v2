import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StripeBillingPortalConfigurationError } from "./billing/stripe-portal";
import type { CurrentUserDetails } from "./users/service";

const {
  createStripeBillingPortalSession,
  createUsersRepository,
  getAuthenticatedSupabaseUser,
  getCurrentUserDetails,
} = vi.hoisted(() => ({
  createStripeBillingPortalSession: vi.fn(),
  createUsersRepository: vi.fn(),
  getAuthenticatedSupabaseUser: vi.fn(),
  getCurrentUserDetails: vi.fn(),
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/users/service", () => ({
  getCurrentUserDetails,
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
    createUsersRepository.mockReset();
    getCurrentUserDetails.mockReset();
    createStripeBillingPortalSession.mockReset();
    createUsersRepository.mockReturnValue({ usersRepository: true });
    getCurrentUserDetails.mockResolvedValue({
      ok: true,
      data: currentUser(),
    });
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

  it("blocks non-admin organization members before opening the Stripe portal", async () => {
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
    createStripeBillingPortalSession.mockResolvedValue({
      id: "bps_live",
      url: "https://billing.stripe.com/p/session",
    });

    const route = await import("../app/billing/portal/route");
    const response = await route.GET(new Request("https://argos.ai/billing/portal"));

    expect(response.headers.get("location")).toBe(
      "https://argos.ai/settings?billing_error=admin_required",
    );
    expect(createStripeBillingPortalSession).not.toHaveBeenCalled();
  });

  it("returns users to settings when the local billing actor cannot be loaded", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValue({
      id: "auth-user-1",
    });
    getCurrentUserDetails.mockResolvedValue({
      ok: false,
      status: 404,
      error: "User not found",
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
