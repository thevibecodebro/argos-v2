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
    expect(moduleCss).toContain("scroll-padding-top: 7.5rem;");
    expect(moduleCss).toContain(".argos-footer nav[aria-label=\"Legal\"] a");
    expect(moduleCss).toContain("min-height: 2.75rem;");
    expect(moduleCss).not.toContain("mix-blend-mode: screen");
    expect(moduleCss).not.toContain("clip-path: inset");
    expect(moduleCss).not.toContain("filter: blur(12px)");
  });

  it("keeps the landing scroll spy deterministic and the forge scene stable", () => {
    const controller = readFileSync(
      new URL("../components/public/landing-motion-controller.tsx", import.meta.url),
      "utf8",
    );
    const scene = readFileSync(
      new URL("../components/public/argos-listening-engine-scene.tsx", import.meta.url),
      "utf8",
    );

    expect(controller).toContain("getSectionVisibilityScore");
    expect(controller).toContain("requestActiveSectionUpdate");
    expect(controller).toContain('link.setAttribute("aria-current", "true")');
    expect(controller).toContain('link.classList.toggle(styles["is-active"], isActive)');
    expect(controller).toContain('window.addEventListener("scroll", requestActiveSectionUpdate');
    expect(scene).not.toContain("pointermove");
    expect(scene).toContain('root.style.setProperty("--forge-pointer-x", "0")');
    expect(scene).toContain('root.style.setProperty("--forge-pointer-y", "0")');
  });
});
