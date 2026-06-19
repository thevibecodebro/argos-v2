import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsSecondaryRail } from "../components/settings/settings-secondary-rail";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    createElement("a", { href, ...props }, children),
}));

const adminItems = [
  { href: "/settings", icon: "person", key: "account", label: "Account" },
  { href: "/settings/branding", icon: "palette", key: "branding", label: "Branding" },
  { href: "/settings/people", icon: "group", key: "people", label: "People" },
  { href: "/settings/rubric", icon: "grading", key: "rubrics", label: "Rubrics" },
  { href: "/settings/compliance", icon: "verified_user", key: "compliance", label: "Compliance" },
];

describe("SettingsSecondaryRail", () => {
  it("shows the Rubrics entry to admins and marks it active on the rubric route", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsSecondaryRail, { activeKey: "rubrics", items: adminItems }),
    );

    expect(html).toContain('href="/settings/rubric"');
    expect(html).toContain('href="/settings/branding"');
    expect(html).toContain("Rubrics");
    expect(html).toContain("Branding");
    expect(html).toContain("Settings");
    expect(html).toContain("Sections");
    expect(html).toContain('aria-current="page"');
  });

  it("renders only the items supplied by the settings route", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsSecondaryRail, {
        activeKey: "account",
        items: [adminItems[0]],
      }),
    );

    expect(html).not.toContain('href="/settings/rubric"');
    expect(html).not.toContain("Rubrics");
    expect(html).toContain('href="/settings"');
  });

  it("uses the shared secondary rail active state instead of the old side stripe", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsSecondaryRail, { activeKey: "rubrics", items: adminItems }),
    );

    expect(html).toContain('data-secondary-rail="settings"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("border-r-2");
  });

  it("renders settings rail icons through the shared ForgeIcon primitive", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsSecondaryRail, { activeKey: "rubrics", items: adminItems }),
    );

    expect(html).toContain('data-forge-icon-name="grading"');
    expect(html).toContain('data-forge-icon-name="verified_user"');
    expect(html).not.toContain(">grading<");
    expect(html).not.toContain(">verified_user<");
  });

  it("renders a desktop collapse control for icon-only navigation", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsSecondaryRail, { activeKey: "rubrics", items: adminItems }),
    );

    expect(html).toContain('data-secondary-rail-collapsed="false"');
    expect(html).toContain("Collapse Settings");
    expect(html).toContain('aria-label="Rubrics"');
    expect(html).toContain("secondary-rail-item-label");
  });
});
