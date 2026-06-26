import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../app/page";
import InvitePage from "../app/invite/[token]/page";
import LoginPage from "../app/login/page";

function getAriaHiddenSvgClasses(html: string) {
  return Array.from(
    html.matchAll(/<svg\b(?=[^>]*aria-hidden="true")[^>]*class="([^"]*)"/g),
    (match) => match[1],
  );
}

const loginFormSource = readFileSync(new URL("../components/auth/login-form.tsx", import.meta.url), "utf8");

const {
  checkRateLimitForPolicyMock,
  createSupabaseServerClientMock,
  createPlatformRepositoryMock,
  redirectMock,
  findInviteByTokenMock,
  getPlatformStaffAfterProvisioningMock,
  headersMock,
  ensureUserProvisionedMock,
  SupabaseProvisioningRepositoryMock,
} = vi.hoisted(() => ({
  checkRateLimitForPolicyMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  createPlatformRepositoryMock: vi.fn(),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  findInviteByTokenMock: vi.fn(),
  getPlatformStaffAfterProvisioningMock: vi.fn(),
  headersMock: vi.fn(),
  ensureUserProvisionedMock: vi.fn(),
  SupabaseProvisioningRepositoryMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository: createPlatformRepositoryMock,
}));

vi.mock("@/lib/platform/auth", () => ({
  getPlatformStaffAfterProvisioning: getPlatformStaffAfterProvisioningMock,
}));

vi.mock("@/lib/provisioning/repository", () => ({
  SupabaseProvisioningRepository: SupabaseProvisioningRepositoryMock,
}));

vi.mock("@/lib/provisioning/service", () => ({
  ensureUserProvisioned: ensureUserProvisionedMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/invites/create-repository", () => ({
  createInvitesRepository: () => ({
    findInviteByToken: findInviteByTokenMock,
  }),
}));

vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy: checkRateLimitForPolicyMock,
}));

describe("legacy auth shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(
      new Headers({
        "x-forwarded-for": "203.0.113.250, 10.0.0.1",
        "x-real-ip": "198.51.100.9",
        "x-vercel-forwarded-for": "198.51.100.22, 10.0.0.2",
      }),
    );
    checkRateLimitForPolicyMock.mockResolvedValue({
      allowed: true,
      bucketKey: "inviteLookup:ip:hash",
      limit: 60,
      remaining: 59,
      requestCount: 1,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 2670,
    });
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    createPlatformRepositoryMock.mockReturnValue({
      findStaffByUserId: vi.fn(),
      upsertStaff: vi.fn(),
    });
    getPlatformStaffAfterProvisioningMock.mockResolvedValue(null);
    ensureUserProvisionedMock.mockResolvedValue({
      created: false,
      orgId: "org-1",
      userId: "auth-user-1",
    });
  });

  it("renders the landing page ahead of the login flow", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).not.toContain("Sales standard installation + Argos platform");
    expect(html).toContain("Build a sales team that actually follows the playbook.");
    expect(html).toContain("We Install The Sales Standard In Your Organization");
    expect(html).toContain("Argos makes it visible in the work: calls reviewed, reps scored");
    expect(html).not.toContain("Call review -&gt; Rubrics scored -&gt; Training assigned -&gt; Roleplay tracked -&gt; Manager dashboard");
    expect(html).toContain('aria-label="Argos product coaching walkthrough"');
    expect(html).not.toContain("Every call should become the next coaching move.");
    expect(html).toContain('aria-label="Argos product showcase"');
    expect(Array.from(html.matchAll(/data-showcase-slide=/g))).toHaveLength(8);
    expect(html).toContain("/homepage-product/argos-dashboard.png");
    expect(html).toContain("/homepage-product/argos-calls.png");
    expect(html).toContain("/homepage-product/argos-scorecard.png");
    expect(html).toContain("/homepage-product/argos-highlights.png");
    expect(html).toContain("/homepage-product/argos-training.png");
    expect(html).toContain("/homepage-product/argos-roleplay.png");
    expect(html).toContain("/homepage-product/argos-team.png");
    expect(html).toContain("/homepage-product/argos-leaderboard.png");
    expect(html).not.toContain("/homepage-product/argos-dashboard-workspace.png");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Calls");
    expect(html).toContain("Call review");
    expect(html).toContain("Scorecards");
    expect(html).toContain("Highlights");
    expect(html).toContain("Training");
    expect(html).toContain("Roleplay");
    expect(html).toContain("Team");
    expect(html).toContain("Leaderboard");
    expect(html).toContain("Know where to coach");
    expect(html).toContain("Start with the conversations");
    expect(html).toContain("your team actually had.");
    expect(html).not.toContain("Authenticated product screenshot");
    expect(html).not.toContain("Dashboard workspace");
    expect(html).not.toContain("Work queue");
    expect(html).not.toContain("Selected item");
    expect(html).not.toContain("Manager action");
    expect(html).toContain("Previous product view");
    expect(html).toContain("Next product view");
    expect(html).not.toContain("Operating feed");
    expect(html).not.toContain("Animated operating feed cards");
    expect(html).not.toContain("Animated operating feed carousel");
    expect(html).not.toContain("One call becomes five visible handoffs.");
    expect(html).not.toContain("Product in motion");
    expect(html).not.toContain("Live operating loop");
    expect(html).toContain("How The Standard Gets Installed");
    expect(html).toContain("Teach the playbook. Track the behavior.");
    expect(html).toContain("For Reps");
    expect(html).toContain("Book Demo");
    expect(html).not.toContain("Book the coaching walkthrough");
    expect(html).not.toContain("Book The Coaching Walkthrough");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Revenue Command");
    expect(html).not.toContain("Sales standard system");
    expect(html).not.toContain("CALL REVIEW // SCORECARDS AND RUBRICS");
    expect(html).not.toContain("argos-metric-row");
    expect(html).not.toContain("Founder-led sales coaching + Argos platform");
    expect(html).not.toContain("The founder teaches the standard");
    expect(html).not.toContain("Founder teaches the standard");
    expect(html.toLowerCase()).not.toContain("fathom");
    expect(html).not.toContain("Founder reviews calls");
  });

  it("renders the login flow inside the Forge auth shell", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard" }),
      }),
    );

    expect(html).toContain("Welcome back");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Work Email");
    expect(html).toContain('data-auth-shell="forge"');
    expect(html).toContain('data-argos-logo="auth-header"');
    expect(html).toContain('src="/argos_logo_background.png"');
    const navOrder = [
      'href="/#product-in-motion"',
      'href="/#coaching-system"',
      'href="/#standard-installation"',
      'href="/#coaching-loop"',
      'href="/#role-outcomes"',
      'href="/#access"',
    ];
    let lastNavIndex = -1;
    for (const navHref of navOrder) {
      const navIndex = html.indexOf(navHref);
      expect(navIndex).toBeGreaterThan(lastNavIndex);
      lastNavIndex = navIndex;
    }
    expect(html).toContain(">Product</a>");
    expect(html).toContain(">Coaching</a>");
    expect(html).toContain(">Standard</a>");
    expect(html).toContain(">System</a>");
    expect(html).toContain(">Roles</a>");
    expect(html).toContain(">Demo</a>");
    expect(html).toContain(">Log in</a>");
    expect(html).toContain(">Book Demo</a>");
    expect(html).not.toContain("View plans");
    expect(html).not.toContain(">Home</a>");
    expect(html).not.toContain('href="/#features"');
    expect(html).not.toContain('href="/#detail"');
    expect(html).not.toContain('href="/#trust"');
    expect(html).not.toContain('data-argos-logo="auth-panel"');
    expect(html).not.toContain("Turn every sales call into the next practice plan.");
    expect(html).not.toContain("Review calls, score performance, save highlights, assign training, practice roleplay, and coach the team.");
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain('href="/security-policy"');
    expect(html).toContain("forge-form-control");
    expect(html).toContain("forge-focus-ring");
    expect(html).toContain('aria-hidden="true"');
    expect(loginFormSource).toContain("ForgeStatusPanel");
    expect(loginFormSource).toContain("ForgeErrorState");
    expect(html).not.toContain("global logistics operations");
    expect(html).not.toContain("Security Protocol");
    expect(html).not.toContain("Terms of Access");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
  });

  it("sends already-authenticated active platform admins back to the platform dashboard", async () => {
    const authUser = {
      email: "owner@argos.ai",
      id: "auth-user-platform-owner",
    };
    const getUser = vi.fn().mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser,
      },
    });
    ensureUserProvisionedMock.mockResolvedValue({
      created: false,
      orgId: "org-1",
      userId: authUser.id,
    });
    getPlatformStaffAfterProvisioningMock.mockResolvedValue({
      createdAt: new Date("2026-06-11T10:00:00.000Z"),
      createdBy: null,
      revokedAt: null,
      revokedBy: null,
      role: "owner",
      status: "active",
      updatedAt: new Date("2026-06-11T10:00:00.000Z"),
      userId: authUser.id,
    });

    await expect(
      LoginPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/platform/dashboard");

    expect(redirectMock).toHaveBeenCalledWith("/platform/dashboard");
    expect(ensureUserProvisionedMock).toHaveBeenCalledWith(
      expect.any(SupabaseProvisioningRepositoryMock),
      authUser,
    );
    expect(getPlatformStaffAfterProvisioningMock).toHaveBeenCalledWith(
      createPlatformRepositoryMock.mock.results[0]?.value,
      authUser,
    );
  });

  it("keeps decorative auth shell icons non-interactive", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard" }),
      }),
    );
    const decorativeIconClasses = getAriaHiddenSvgClasses(html);

    expect(decorativeIconClasses.length).toBeGreaterThan(0);
    for (const className of decorativeIconClasses) {
      expect(className).not.toContain("cursor-pointer");
      expect(className).not.toContain("forge-focus-ring");
      expect(className).not.toContain("hover:");
    }
  });

  it("renders the invited no-account sign-in bridge inside the Forge auth shell", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });
    findInviteByTokenMock.mockResolvedValue({
      acceptedAt: null,
      email: "rep@example.com",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      role: "rep",
    });

    const html = renderToStaticMarkup(
      await InvitePage({
        params: Promise.resolve({ token: "invite-token" }),
      }),
    );

    expect(html).toContain("Sign in to accept this invite");
    expect(html).toContain("Use the work email your admin invited. If you&#x27;re setting up Argos for your organization, choose a plan instead.");
    expect(html).toContain("Accept your invite");
    expect(html).toContain("No invite yet? Ask your admin or start an organization by signing up.");
    expect(html).toContain("Rep access");
    expect(html).toContain("argos-wordmark");
    expect(html).toContain('data-argos-logo="invite-nav"');
    expect(html).toContain('data-argos-logo="invite-hero"');
    expect(html).toContain('data-argos-logo="invite-footer"');
    expect(html).toContain("2026 Argos Revenue Command. All rights reserved.");
    expect(html).toContain('href="/#access"');
    expect(html).toContain('href="/login?next=%2Finvite%2Finvite-token"');
    expect(html).toContain("Sign in to accept");
    expect(html).toContain("Use a different email");
    expect(html).not.toContain('href="/#features"');
    expect(html).not.toContain('href="/#detail"');
    expect(html).not.toContain('href="/#trust"');
    expect(html).toContain('data-auth-shell="forge"');
    expect(html).toContain("forge-focus-ring");
    expect(checkRateLimitForPolicyMock).toHaveBeenCalledWith("inviteLookup", {
      type: "ip",
      id: "198.51.100.22",
    });
  });

  it("auto-accepts a matching authenticated invite instead of making invited users stop on the page", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "rep@example.com",
              id: "auth-user-1",
            },
          },
        }),
      },
    });
    findInviteByTokenMock.mockResolvedValue({
      acceptedAt: null,
      email: "rep@example.com",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      role: "rep",
    });

    const html = renderToStaticMarkup(
      await InvitePage({
        params: Promise.resolve({ token: "invite-token" }),
      }),
    );

    expect(html).toContain("Joining your workspace");
    expect(html).toContain("We found a matching invitation for your signed-in email.");
    expect(html).toContain("Invite confirmed");
    expect(html).toContain("Joining your workspace...");
    expect(html).toContain('data-auto-accept="true"');
    expect(html).not.toContain("Accept invite");
  });

  it("uses a post signout action when an authenticated invite is opened with the wrong account", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "other@example.com",
              id: "auth-user-1",
            },
          },
        }),
      },
    });
    findInviteByTokenMock.mockResolvedValue({
      acceptedAt: null,
      email: "rep@example.com",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      role: "rep",
    });

    const html = renderToStaticMarkup(
      await InvitePage({
        params: Promise.resolve({ token: "invite-token" }),
      }),
    );

    expect(html).toContain("Wrong account");
    expect(html).toContain("Use a different email");
    expect(html).toContain('action="/auth/signout"');
    expect(html).toContain('method="post"');
    expect(html).not.toContain('href="/auth/signout"');
  });

  it("rate limits invite lookup before auth and repository access", async () => {
    checkRateLimitForPolicyMock.mockResolvedValueOnce({
      allowed: false,
      bucketKey: "inviteLookup:ip:hash",
      limit: 60,
      remaining: 0,
      requestCount: 61,
      resetAt: new Date("2026-04-28T11:00:00.000Z"),
      retryAfterSeconds: 2670,
    });

    const html = renderToStaticMarkup(
      await InvitePage({
        params: Promise.resolve({ token: "invite-token" }),
      }),
    );

    expect(html).toContain("Invite temporarily unavailable");
    expect(html).toContain("Invite lookup paused");
    expect(html).toContain("Try this invite link again later.");
    expect(checkRateLimitForPolicyMock).toHaveBeenCalledWith("inviteLookup", {
      type: "ip",
      id: "198.51.100.22",
    });
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(findInviteByTokenMock).not.toHaveBeenCalled();
  });
});
