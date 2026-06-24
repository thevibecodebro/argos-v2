import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountPanel } from "../components/settings/account-panel";
import type { CurrentUserDetails } from "./users/service";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("AccountPanel", () => {
  it("links organization admins to billing and seat management", () => {
    const html = renderToStaticMarkup(
      createElement(AccountPanel, {
        initialUser: currentUser(),
      }),
    );

    expect(html).toContain("Billing");
    expect(html).toContain("Manage billing and seats");
    expect(html).toContain('href="/billing/portal"');
    expect(html).toContain("Team subscriptions can adjust paid seat quantity from Stripe billing.");
  });

  it("does not expose billing management to non-admin organization members", () => {
    const html = renderToStaticMarkup(
      createElement(AccountPanel, {
        initialUser: currentUser({ role: "manager" }),
      }),
    );

    expect(html).not.toContain("Manage billing and seats");
    expect(html).not.toContain('href="/billing/portal"');
  });
});

function currentUser(overrides: Partial<CurrentUserDetails> = {}): CurrentUserDetails {
  return {
    id: "user-1",
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
