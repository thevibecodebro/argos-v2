import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsOperationalLayout } from "../app/(authenticated)/settings/settings-operational-layout";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => createElement("a", { href, ...props }, children),
}));

describe("deep settings navigation", () => {
  it("uses the supplied allowed destinations on every settings workspace", () => {
    const html = renderToStaticMarkup(createElement(SettingsOperationalLayout, {
      route: "people",
      title: "People",
      description: "Manage users and account access.",
      railItems: [
        { href: "/settings", icon: "person", key: "account", label: "Account" },
        { href: "/settings/people", icon: "group", key: "people", label: "People" },
      ],
      children: "Member roster",
    }));
    expect(html).toContain('href="/settings/people"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('href="/settings/branding"');
    expect(html).not.toContain('href="/settings/integrations"');
    expect(html).toContain("Member roster");
  });
});
