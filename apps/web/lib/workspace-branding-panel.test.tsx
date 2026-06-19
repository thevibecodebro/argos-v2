import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceBrandingPanel } from "../components/settings/workspace-branding-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("WorkspaceBrandingPanel", () => {
  it("renders palettes, simple controls, preview, checks, save actions, and restore copy", () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceBrandingPanel, {
        initialTheme: null,
        organizationName: "Argos Team",
      }),
    );

    expect(html).toContain('data-workspace-branding-panel="true"');
    expect(html).toContain('data-branding-preview="true"');
    expect(html).toContain('data-branding-preset="argos"');
    expect(html).toContain('data-branding-preset="ocean"');
    expect(html).toContain('data-branding-preset="daylight"');
    expect(html).toContain('data-branding-mode-tab="dark"');
    expect(html).toContain('data-branding-mode-tab="light"');
    expect(html).toContain('data-branding-color-row="primary"');
    expect(html).toContain('data-branding-color-row="text"');
    expect(html).toContain('data-branding-nav-row="leftBackground"');
    expect(html).toContain('data-branding-nav-row="topBackground"');
    expect(html).toContain("Left navigation");
    expect(html).toContain("Top navigation");
    expect(html).toContain("Advanced colors");
    expect(html).toContain("Safety checks");
    expect(html).toContain("Save branding");
    expect(html).toContain("Cancel");
    expect(html).not.toContain("var(--forge-shadow)_72%");
    expect(html).not.toContain("var(--forge-shadow)_88%");
    expect(html).toContain(
      "This will remove custom colors and return this workspace to the Argos default light and dark themes. Your logo, users, calls, billing, and settings will not change.",
    );
  });
});
