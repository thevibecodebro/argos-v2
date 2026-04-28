import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsNav } from "../components/settings/settings-nav";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    createElement("a", { href, ...props }, children),
}));

describe("SettingsNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/settings/rubric");
  });

  it("shows the Rubrics entry to admins and marks it active on the rubric route", () => {
    const html = renderToStaticMarkup(createElement(SettingsNav, { role: "admin" }));

    expect(html).toContain('href="/settings/rubric"');
    expect(html).toContain("Rubrics");
    expect(html).toContain("Workspace");
    expect(html).toContain("People");
    expect(html).toContain("Coaching system");
    expect(html).toContain('aria-current="page"');
  });

  it("hides the Rubrics entry from non-admin roles", () => {
    const html = renderToStaticMarkup(createElement(SettingsNav, { role: "manager" }));

    expect(html).not.toContain('href="/settings/rubric"');
    expect(html).not.toContain("Rubrics");
  });

  it("uses the forge settings rail active state instead of the old side stripe", () => {
    const html = renderToStaticMarkup(createElement(SettingsNav, { role: "admin" }));

    expect(html).toContain('data-settings-nav-theme="forge"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("border-r-2");
  });

  it("renders settings rail icons through the shared ForgeIcon primitive", () => {
    const html = renderToStaticMarkup(createElement(SettingsNav, { role: "admin" }));

    expect(html).toContain('data-forge-icon-name="grading"');
    expect(html).toContain('data-forge-icon-name="verified_user"');
    expect(html).not.toContain(">grading<");
    expect(html).not.toContain(">verified_user<");
  });

  it("can collapse the desktop settings rail to icon-only navigation", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsNav, { initialCollapsed: true, role: "admin" }),
    );

    expect(html).toContain('data-settings-nav-collapsed="true"');
    expect(html).toContain("Expand settings navigation");
    expect(html).toContain('aria-label="Rubrics"');
    expect(html).toContain('data-settings-nav-label="true"');
  });
});
