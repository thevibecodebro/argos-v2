import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public landing styles", () => {
  it("defines landing animation primitives and reduced-motion overrides", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(css).toContain(".landing-page");
    expect(css).toContain(".landing-field");
    expect(css).toContain("@keyframes landing-field-drift");
    expect(css).toContain("@keyframes landing-orbit-drift");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
