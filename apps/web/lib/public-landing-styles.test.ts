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

  it("keeps the public nav restrained and compact across viewports", () => {
    const moduleCss = readFileSync(
      new URL("../components/public/landing-page.module.css", import.meta.url),
      "utf8",
    );

    expect(moduleCss).toContain(".argos-wordmark-image");
    expect(moduleCss).toContain("object-fit: contain;");
    expect(moduleCss).toContain("width: min(76rem, calc(100% - clamp(1rem, 4vw, 2.5rem)));");
    expect(moduleCss).toContain("grid-template-columns: minmax(11rem, 1fr) auto minmax(11rem, 1fr);");
    expect(moduleCss).toContain(".argos-nav-links {");
    expect(moduleCss).toContain(".argos-nav-links a::after");
    expect(moduleCss).toContain("border-color: transparent;");
    expect(moduleCss).toContain("@media (max-width: 700px)");
    expect(moduleCss).toContain("grid-template-columns: minmax(0, 1fr) auto;");
    expect(moduleCss).toContain("overflow-x: auto;");
    expect(moduleCss).toContain("min-height: 2.75rem;");
    expect(moduleCss).toContain("scroll-padding-top: 7.5rem;");
  });

  it("keeps production homepage sections stable while scrolling", () => {
    const moduleCss = readFileSync(
      new URL("../components/public/landing-page.module.css", import.meta.url),
      "utf8",
    );
    const controller = readFileSync(
      new URL("../components/public/landing-motion-controller.tsx", import.meta.url),
      "utf8",
    );

    expect(moduleCss).not.toContain("min-height: 100svh;");
    expect(moduleCss).not.toContain("transform 1100ms var(--argos-ease)");
    expect(moduleCss).toMatch(/\.argos-section\s*\{\s*min-height: auto;/);
    expect(moduleCss).toMatch(/\.argos-feature-section\s*\{[\s\S]*?align-items: start;/);
    expect(moduleCss).toMatch(/\.argos-detail-section\s*\{[\s\S]*?align-items: start;/);
    expect(moduleCss).toMatch(/\.argos-trust-section\s*\{[\s\S]*?align-items: start;/);
    expect(moduleCss).toMatch(/\.argos-hero,\n\.argos-section\s*\{[\s\S]*?scroll-margin-top: 0;/);
    expect(moduleCss).toMatch(/\.argos-access-section\s*\{[\s\S]*?scroll-margin-top: 0;/);
    expect(moduleCss).not.toContain("scroll-margin-top: 9.75rem;");
    expect(moduleCss).toContain(".argos-nav-shell::before");
    expect(moduleCss).toContain("height: calc(100% + 1rem);");
    expect(moduleCss).toContain("font-size: clamp(2.8rem, 6vw, 5.5rem);");
    expect(moduleCss).toContain("transform: translate3d(0, 0.65rem, 0);");
    expect(moduleCss).toContain("opacity 420ms var(--argos-ease)");
    expect(controller).toContain('rootMargin: "0px 0px -4% 0px"');
    expect(controller).toContain("threshold: 0.24");
  });
});
