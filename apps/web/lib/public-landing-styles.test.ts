import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public landing styles", () => {
  it("keeps the 3D landing styles out of the app-wide stylesheet", () => {
    const globalsCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const moduleCss = readFileSync(
      new URL("../components/public/landing-page.module.css", import.meta.url),
      "utf8",
    );
    const landingPage = readFileSync(
      new URL("../components/public/landing-page.tsx", import.meta.url),
      "utf8",
    );

    expect(landingPage).toContain('import styles from "./landing-page.module.css";');
    expect(globalsCss).not.toContain(".argos-3d-page");
    expect(globalsCss).not.toContain(".argos-scene-canvas");
    expect(globalsCss).not.toContain(".argos-feature-shell");
    expect(moduleCss).toContain(".argos-3d-page");
    expect(moduleCss).toContain(".argos-scene-canvas");
    expect(moduleCss).toContain(".argos-nav");
    expect(moduleCss).toContain(".argos-feature-shell");
    expect(moduleCss).toContain(".argos-primary-action");
    expect(moduleCss).toContain(".argos-plan-button");
    expect(moduleCss).toContain(".argos-credit-strip");
    expect(moduleCss).toContain(".argos-reveal-ready [data-reveal]");
    expect(moduleCss).toContain(":focus-visible");
    expect(moduleCss).toContain(".argos-nav-links a.is-active");
    expect(moduleCss).toContain("--argos-ivory: var(--forge-text);");
    expect(moduleCss).toContain("--argos-gold: var(--forge-gold);");
    expect(moduleCss).toContain('--argos-serif: var(--font-display, "Space Grotesk", sans-serif);');
    expect(moduleCss).toContain("outline: 2px solid var(--forge-gold);");
    expect(moduleCss).toContain("color: var(--forge-text);");
    expect(moduleCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(moduleCss).not.toContain(".auth-page");
    expect(moduleCss).not.toContain(".landing-page");
    expect(moduleCss).not.toContain("#74b1ff");
    expect(moduleCss).not.toContain("#6dddff");
  });
});
