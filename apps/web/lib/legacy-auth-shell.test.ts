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
  findInviteByTokenMock,
  headersMock,
} = vi.hoisted(() => ({
  checkRateLimitForPolicyMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  findInviteByTokenMock: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
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
  });

  it("renders the landing page ahead of the login flow", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Turn every sales call into the next practice plan.");
    expect(html).toContain("Sales call review, coaching, and roleplay");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Revenue Command");
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
    expect(html).toContain("Review calls, score performance, save highlights, assign training, practice roleplay, and coach the team.");
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

  it("preserves invite sign-in redirect inside the Forge auth shell", async () => {
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

    expect(html).toContain("You&#x27;re Invited");
    expect(html).toContain('href="/login?next=%2Finvite%2Finvite-token"');
    expect(html).toContain('data-auth-shell="forge"');
    expect(html).toContain("forge-focus-ring");
    expect(checkRateLimitForPolicyMock).toHaveBeenCalledWith("inviteLookup", {
      type: "ip",
      id: "198.51.100.22",
    });
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

    expect(html).toContain("Invite Temporarily Unavailable");
    expect(html).toContain("Try this invite link again later.");
    expect(checkRateLimitForPolicyMock).toHaveBeenCalledWith("inviteLookup", {
      type: "ip",
      id: "198.51.100.22",
    });
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(findInviteByTokenMock).not.toHaveBeenCalled();
  });
});
