import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readPublicFile(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
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

  it("keeps the public landing styles scoped to the CSS module", () => {
    const globalsCss = readPublicFile("../app/globals.css");
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");
    const landingPage = readPublicFile("../components/public/landing-page.tsx");

    expect(landingPage).toContain('import styles from "./landing-page.module.css";');
    expect(globalsCss).not.toContain(".argos-3d-page");
    expect(globalsCss).not.toContain(".argos-plan-row");
    expect(globalsCss).not.toContain(".argos-billing-segments");
    expect(moduleCss).toContain(".argos-3d-page");
    expect(moduleCss).toContain(".argos-hero-frame");
    expect(moduleCss).toContain(".argos-wordmark");
    expect(moduleCss).toContain(".argos-wordmark-image");
    expect(moduleCss).toContain(".argos-console-shell");
    expect(moduleCss).toContain(".argos-feature-grid");
    expect(moduleCss).toContain(".argos-plan-row");
    expect(moduleCss).toContain(".argos-billing-segments");
    expect(moduleCss).toContain(".argos-plan-price-monthly");
    expect(moduleCss).toContain(".argos-plan-price-annual");
    expect(moduleCss).toContain(".argos-plan:has(input[value$=\"-annual\"]:checked)");
    expect(moduleCss).toContain(".argos-credit-strip");
    expect(moduleCss).toContain(".argos-footer");
    expect(moduleCss).toContain(":focus-visible");
    expect(moduleCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the pricing controls usable across breakpoints", () => {
    const moduleCss = readPublicFile("../components/public/landing-page.module.css");

    expect(moduleCss).toContain(".argos-billing-segments");
    expect(moduleCss).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(moduleCss).toContain(".argos-billing-option:has(input:checked)");
    expect(moduleCss).toContain(".argos-billing-option:has(input:focus-visible)");
    expect(moduleCss).toContain(".argos-plan-featured .argos-muted-copy");
    expect(moduleCss).toContain(".argos-muted-copy");
    expect(moduleCss).toMatch(/@media \(max-width: 1024px\)[\s\S]*?\.argos-plan-row\s*\{[\s\S]*?grid-template-columns: 1fr;/);
    expect(moduleCss).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.argos-primary-action,[\s\S]*?\.argos-plan-button\s*\{[\s\S]*?width: 100%;/);
  });
});
