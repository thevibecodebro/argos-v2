import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public landing styles", () => {
  it("defines the 3D landing utility styles and reduced-motion overrides", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(css).toContain(".argos-3d-page");
    expect(css).toContain(".argos-scene-canvas");
    expect(css).toContain(".argos-nav");
    expect(css).toContain(".argos-feature-shell");
    expect(css).toContain(".argos-primary-action");
    expect(css).toContain(".argos-plan-button");
    expect(css).toContain(".argos-credit-strip");
    expect(css).toContain(".argos-reveal-ready [data-reveal]");
    expect(css).toContain(":focus-visible");
    expect(css).toContain(".argos-nav-links a.is-active");
    expect(css).toContain("--argos-ivory: var(--forge-text);");
    expect(css).toContain("--argos-gold: var(--forge-gold);");
    expect(css).toContain('--argos-serif: var(--font-display, "Space Grotesk", sans-serif);');
    expect(css).toContain("outline: 2px solid var(--forge-gold);");
    expect(css).toContain("color: var(--forge-text);");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain(".auth-page");
    expect(css).not.toContain(".landing-page");
    expect(css).not.toContain("#74b1ff");
    expect(css).not.toContain("#6dddff");
  });
});
