import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../app/page";
import InvitePage from "../app/invite/[token]/page";
import LoginPage from "../app/login/page";

function getAriaHiddenSvgClasses(html: string) {
  return Array.from(
    html.matchAll(/<svg\b(?=[^>]*aria-hidden="true")[^>]*class="([^"]*)"/g),
    (match) => match[1],
  );
}

const { createSupabaseServerClientMock, findInviteByTokenMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  findInviteByTokenMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/invites/create-repository", () => ({
  createInvitesRepository: () => ({
    findInviteByToken: findInviteByTokenMock,
  }),
}));

describe("legacy auth shell", () => {
  it("renders the landing page ahead of the login flow", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Turn every sales call into the next practice plan.");
    expect(html).toContain("Sales call review, coaching, and roleplay");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Coaching Forge");
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
    expect(html).toContain("Review calls, score performance, surface highlights, assign training, practice roleplay, and coach the team.");
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain('href="/security-policy"');
    expect(html).toContain("forge-form-control");
    expect(html).toContain("forge-focus-ring");
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
  });
});
