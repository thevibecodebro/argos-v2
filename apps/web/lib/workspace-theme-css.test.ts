import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workspace theme CSS", () => {
  it("uses the workspace focus variable for visible focus styles", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("--forge-focus: var(--forge-gold)");
    expect(css).toContain("outline: 2px solid var(--forge-focus)");
    expect(css).toContain("color-mix(in srgb, var(--forge-focus) 16%, transparent)");
    expect(css).toContain("border-color: color-mix(in srgb, var(--forge-focus) 46%, transparent)");
  });
});
