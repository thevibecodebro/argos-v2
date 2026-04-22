import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public landing styles", () => {
  it("defines the html-sample landing utility styles and reduced-motion overrides", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(css).toContain(".landing-page");
    expect(css).toContain(".glass-card");
    expect(css).toContain(".text-glow");
    expect(css).toContain(".gradient-bg");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
