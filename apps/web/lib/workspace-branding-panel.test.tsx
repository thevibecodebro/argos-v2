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
    // Option A: logo lives in Brand & appearance alongside the accent.
    expect(html).toContain('data-branding-logo="true"');
    expect(html).toContain("Workspace logo");
    expect(html).toContain('data-branding-logo-upload="true"');
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

  it("shows the current logo with replace and remove controls when one exists", () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceBrandingPanel, {
        initialLogoUrl: "https://assets.example/org-logo.png",
        initialTheme: null,
        organizationName: "Argos Team",
      }),
    );

    expect(html).toContain('data-branding-logo-image="true"');
    expect(html).toContain('src="https://assets.example/org-logo.png"');
    expect(html).toContain('alt="Argos Team logo"');
    expect(html).toContain("Replace logo");
    expect(html).toContain('data-branding-logo-remove="true"');
  });
});
