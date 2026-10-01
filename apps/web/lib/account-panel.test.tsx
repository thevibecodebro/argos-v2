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
  it("keeps source-aware billing controls out of the profile panel", () => {
    const html = renderToStaticMarkup(
      createElement(AccountPanel, {
        initialUser: currentUser(),
      }),
    );

    expect(html).not.toContain("Manage billing and seats");
    expect(html).not.toContain('href="/billing/portal"');
  });

  it("keeps profile editing prominent and workspace identifiers available on demand", () => {
    const html = renderToStaticMarkup(createElement(AccountPanel, { initialUser: currentUser() }));
    const details = html.match(/<details[^>]*data-account-workspace-details="true"[^>]*>([\s\S]*?)<\/details>/);

    expect(html).toContain("Edit profile");
    expect(details).not.toBeNull();
    expect(details?.[0]).not.toContain(" open");
    expect(details?.[1]).toContain("Workspace details");
    expect(details?.[1]).toContain("Copy org ID");
    expect(details?.[1]).toContain("Webhook and API references");
    expect(details?.[1]).toContain("Created");
    expect(html.indexOf("Edit profile")).toBeLessThan(html.indexOf("Workspace details"));
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
