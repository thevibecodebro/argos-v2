import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readPublicFile(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function expectCssRule(moduleCss: string, selector: string, declarations: string[]) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedSelector}\\s*\\{(?<body>[\\s\\S]*?)\\}`).exec(moduleCss);
  expect(match?.groups?.body).toBeDefined();

  for (const declaration of declarations) {
    expect(match?.groups?.body).toContain(declaration);
  }
}

describe("public landing styles", () => {
  it("keeps the public landing page visible without a client reveal gate", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");
    const landingPage = readPublicFile("../components/public/landing-page.tsx");

    expect(landingPage).not.toContain("LandingMotionController");
    expect(landingPage).not.toContain("data-reveal");
    expect(moduleCss).not.toContain(".argos-reveal-ready");
    expect(moduleCss).not.toContain("[data-reveal]");
    expect(moduleCss).not.toContain(".is-visible");
  });

  it("hides Next development chrome from homepage previews", () => {
    const nextConfig = readPublicFile("../next.config.ts");

    expect(nextConfig).toContain("devIndicators: false");
  });

  it("keeps the public landing styles scoped to the CSS module", () => {
    const globalsCss = readPublicFile("../app/globals.css");
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");
    const landingPage = readPublicFile("../components/public/landing-page.tsx");

    expect(landingPage).toContain('import styles from "./landing-page.module.css";');
    expect(globalsCss).not.toContain(".argos-3d-page");
    expect(globalsCss).not.toContain(".argos-access-panel");
    expect(globalsCss).not.toContain(".argos-product-showcase");
    expect(moduleCss).toContain(".argos-3d-page");
    expect(moduleCss).toContain(".argos-hero-frame");
    expect(moduleCss).toContain(".argos-wordmark");
    expect(moduleCss).toContain(".argos-wordmark-image");
    expect(moduleCss).toContain(".argos-footer-wordmark");
    expect(moduleCss).toContain(".argos-product-showcase");
    expect(moduleCss).toContain(".argos-product-showcase-rail");
    expect(moduleCss).toContain(".argos-product-showcase-frame");
    expect(moduleCss).toContain(".argos-product-showcase-controls");
    expect(moduleCss).toContain(".argos-standard-grid");
    expect(moduleCss).toContain(".argos-standard-card");
    expect(moduleCss).toContain(".argos-offer-grid");
    expect(moduleCss).toContain(".argos-offer-card");
    expect(moduleCss).toContain(".argos-role-section");
    expect(moduleCss).toContain(".argos-feature-grid");
    expect(moduleCss).toContain(".argos-role-grid");
    expect(moduleCss).toContain(".argos-role-card");
    expect(moduleCss).toContain(".argos-demo-grid");
    expect(moduleCss).toContain(".argos-demo-proof");
    expect(moduleCss).toContain(".argos-footer");
    expect(moduleCss).toContain(":focus-visible");
    expect(moduleCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the shared shell classes used by login and invite pages", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    // legacy-shell.tsx and invite-access-shell.tsx compose these classes.
    for (const sharedClass of [
      ".argos-nav-shell",
      ".argos-nav",
      ".argos-brand",
      ".argos-nav-links",
      ".argos-nav-actions",
      ".argos-login-link",
      ".argos-mini-cta",
      ".argos-hero",
      ".argos-hero-copy",
      ".argos-eyebrow",
      ".argos-hero-body",
      ".argos-hero-meter",
      ".argos-primary-action",
      ".argos-action-disc",
      ".argos-secondary-action",
      ".argos-footer-brand",
      ".argos-scene-canvas",
      ".argos-scene-fallback",
      ".argos-forge-film",
      ".layer-a",
      ".layer-b",
    ]) {
      expect(moduleCss).toContain(sharedClass);
    }
  });

  it("uses the brand board palette and typography tokens", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    expect(moduleCss).toContain("--argos-command: #1c1f1a;");
    expect(moduleCss).toContain("--argos-forest: #2a372d;");
    expect(moduleCss).toContain("--argos-lichen: #6b6d62;");
    expect(moduleCss).toContain("--argos-bark: #a99e89;");
    expect(moduleCss).toContain("--argos-alabaster: #edebe4;");
    expect(moduleCss).toContain("--argos-gold: #c9a84c;");
    expect(moduleCss).toContain('--argos-font-display: var(--font-argos-display, "Cormorant Garamond"');
  });

  it("keeps the demo section usable across breakpoints", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    expect(moduleCss).toContain(".argos-demo-grid");
    expect(moduleCss).toContain("grid-template-columns: minmax(0, 1fr) minmax(17rem, 23rem);");
    expect(moduleCss).toContain(".argos-demo-button:focus-visible");
    expect(moduleCss).toMatch(
      /@media \(max-width: 1024px\)[\s\S]*?\.argos-standard-grid,[\s\S]*?\.argos-role-grid\s*\{[\s\S]*?grid-template-columns: 1fr;/,
    );
    expect(moduleCss).toMatch(
      /@media \(max-width: 1024px\)[\s\S]*?\.argos-offer-grid,[\s\S]*?\.argos-demo-grid\s*\{[\s\S]*?grid-template-columns: 1fr;/,
    );
    expect(moduleCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.argos-primary-action,[\s\S]*?\.argos-demo-button\s*\{[\s\S]*?width: 100%;/,
    );
  });

  it("keeps the hero framed inside the first viewport without a bordered hero label", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    expectCssRule(moduleCss, ".argos-hero-copy .argos-eyebrow", [
      "justify-content: center;",
    ]);
    expectCssRule(moduleCss, ".argos-eyebrow", [
      "border: 0;",
      "padding: 0;",
    ]);
    expectCssRule(moduleCss, ".argos-hero", [
      "min-height: 100svh;",
    ]);
    expectCssRule(moduleCss, ".argos-hero-copy h1", [
      "font-family: var(--argos-font-display);",
      "font-weight: 300;",
    ]);
    expect(moduleCss).not.toContain(".argos-hero-terminal");
  });

  it("keeps the product showcase crossfade reduced-motion safe", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");
    const showcase = readPublicFile("../components/public/product-showcase.tsx");

    expect(moduleCss).toContain("aspect-ratio: 16 / 10;");
    expect(moduleCss).toContain('.argos-product-showcase-image[data-active="true"]');
    expect(moduleCss).toContain(".argos-product-showcase-arrow-icon");
    expect(moduleCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;/,
    );
    // Auto-advance must never start for reduced-motion users.
    expect(showcase).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps scroll-driven motion as pure CSS progressive enhancement", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    // Scroll-linked animations only apply where the browser supports them
    // and the user tolerates motion; otherwise content is fully visible.
    expect(moduleCss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)[\s\S]*?@supports \(animation-timeline: view\(\)\)/,
    );
    expect(moduleCss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)[\s\S]*?@supports \(animation-timeline: scroll\(\)\)/,
    );
  });
});
