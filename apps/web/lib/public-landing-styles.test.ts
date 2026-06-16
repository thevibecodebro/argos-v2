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
    expect(globalsCss).not.toContain(".argos-plan-row");
    expect(globalsCss).not.toContain(".argos-demo-video");
    expect(moduleCss).toContain(".argos-3d-page");
    expect(moduleCss).toContain(".argos-hero-frame");
    expect(moduleCss).toContain(".argos-hero-proof");
    expect(moduleCss).toContain(".argos-wordmark");
    expect(moduleCss).toContain(".argos-wordmark-image");
    expect(moduleCss).toContain(".argos-footer-wordmark");
    expect(moduleCss).toContain(".argos-console-shell");
    expect(moduleCss).toContain(".argos-operating-preview");
    expect(moduleCss).toContain(".argos-operating-state");
    expect(moduleCss).toContain(".argos-standard-grid");
    expect(moduleCss).toContain(".argos-standard-card");
    expect(moduleCss).toContain(".argos-offer-grid");
    expect(moduleCss).toContain(".argos-offer-card");
    expect(moduleCss).toContain(".argos-role-section");
    expect(moduleCss).not.toContain(".argos-signal-strip");
    expect(moduleCss).not.toContain(".argos-metric-row");
    expect(moduleCss).not.toContain(".argos-metric-card");
    expect(moduleCss).not.toContain(".argos-standard-system-card");
    expect(moduleCss).not.toContain(".argos-founder-led-card");
    expect(moduleCss).toContain(".argos-feature-grid");
    expect(moduleCss).toContain(".argos-feature-proof");
    expect(moduleCss).toContain(".argos-role-grid");
    expect(moduleCss).toContain(".argos-role-card");
    expect(moduleCss).toContain(".argos-demo-grid");
    expect(moduleCss).toContain(".argos-demo-video");
    expect(moduleCss).toContain(".argos-demo-play");
    expect(moduleCss).toContain(".argos-demo-proof");
    expect(moduleCss).not.toContain(".argos-billing-segments");
    expect(moduleCss).not.toContain(".argos-plan-price-monthly");
    expect(moduleCss).not.toContain(".argos-credit-strip");
    expect(moduleCss).toContain(".argos-footer");
    expect(moduleCss).toContain(":focus-visible");
    expect(moduleCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the demo section usable across breakpoints", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    expect(moduleCss).toContain(".argos-demo-grid");
    expect(moduleCss).toContain("grid-template-columns: minmax(0, 1fr) minmax(17rem, 23rem);");
    expect(moduleCss).toContain(".argos-demo-video");
    expect(moduleCss).toContain("aspect-ratio: 16 / 9;");
    expect(moduleCss).toContain(".argos-demo-button:focus-visible");
    expect(moduleCss).toMatch(/@media \(max-width: 1024px\)[\s\S]*?\.argos-standard-grid,[\s\S]*?\.argos-role-grid\s*\{[\s\S]*?grid-template-columns: 1fr;/);
    expect(moduleCss).toMatch(/@media \(max-width: 1024px\)[\s\S]*?\.argos-demo-grid\s*\{[\s\S]*?grid-template-columns: 1fr;/);
    expect(moduleCss).toMatch(/@media \(max-width: 1024px\)[\s\S]*?\.argos-offer-grid,[\s\S]*?\.argos-demo-grid\s*\{[\s\S]*?grid-template-columns: 1fr;/);
    expect(moduleCss).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.argos-primary-action,[\s\S]*?\.argos-demo-button\s*\{[\s\S]*?width: 100%;/);
  });

  it("keeps the hero framed inside the first viewport without a bordered hero label", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    expectCssRule(moduleCss, ".argos-hero-copy .argos-eyebrow", [
      "border: 0;",
      "margin: 0 0 1.25rem;",
      "padding: 0;",
    ]);
    expectCssRule(moduleCss, ".argos-hero", [
      "min-height: 100svh;",
      "padding: 5.75rem clamp(1rem, 4vw, 2rem) 1.25rem;",
    ]);
    expectCssRule(moduleCss, ".argos-hero-frame", [
      "min-height: min(42rem, calc(100svh - 7rem));",
      "grid-template-columns: minmax(0, 1fr);",
      "padding: clamp(1.25rem, 3svh, 2.5rem) clamp(1.25rem, 4vw, 3rem);",
    ]);
    expectCssRule(moduleCss, ".argos-hero-copy h1", [
      "font-size: clamp(3.5rem, 11.5svh, 6rem);",
    ]);
    expect(moduleCss).not.toContain(".argos-hero-terminal");
  });

  it("keeps product-in-motion animation CSS-only and reduced-motion safe", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    expect(moduleCss).toContain("@keyframes argos-operating-scan");
    expect(moduleCss).toContain("@keyframes argos-status-pulse");
    expect(moduleCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.argos-operating-preview::before,[\s\S]*?\.argos-operating-state::before\s*\{[\s\S]*?animation: none;/);
  });

  it("keeps the homepage adapted for narrow, tablet, and short landscape viewports", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    expect(moduleCss).toMatch(/@media \(max-width: 1024px\)[\s\S]*?\.argos-hero-copy h1\s*\{[\s\S]*?max-width: 18ch;[\s\S]*?font-size: clamp\(3\.4rem, 8\.4svh, 5\.25rem\);/);
    expect(moduleCss).toMatch(/@media \(max-width: 420px\)[\s\S]*?\.argos-score-panel strong\s*\{[\s\S]*?font-size: clamp\(2\.65rem, 12vw, 3\.05rem\);/);
    expect(moduleCss).toMatch(/@media \(max-width: 360px\)[\s\S]*?\.argos-hero-copy h1\s*\{[\s\S]*?font-size: clamp\(2\.25rem, 13\.5vw, 2\.7rem\);/);
    expect(moduleCss).toMatch(/@media \(max-height: 520px\) and \(min-width: 700px\)[\s\S]*?\.argos-hero-copy h1\s*\{[\s\S]*?max-width: 22ch;[\s\S]*?font-size: clamp\(2\.35rem, 10svh, 3rem\);/);
  });
});
