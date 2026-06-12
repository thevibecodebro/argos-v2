import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../../..");

describe("public homepage source of truth", () => {
  it("keeps one canonical Argos homepage direction and removes superseded narratives", () => {
    const sourcePath = resolve(repoRoot, "docs/public-homepage-source-of-truth.md");
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain("Canonical public homepage direction");
    expect(source).toContain("Sales teams changed. Coaching should have too.");
    expect(source).toContain("call review -> scored evidence -> coaching moment -> roleplay drill -> next call");
    expect(source).toContain("Do not resurrect");
    expect(source).toContain("Coaching Flywheel");
    expect(source).toContain("Sales Evolution era-history");

    expect(
      existsSync(resolve(repoRoot, "docs/superpowers/specs/2026-06-12-coaching-flywheel-homepage-design.md")),
    ).toBe(false);
    expect(
      existsSync(resolve(repoRoot, "docs/superpowers/specs/2026-06-12-sales-evolution-homepage-design.md")),
    ).toBe(false);
    expect(
      existsSync(resolve(repoRoot, "docs/superpowers/plans/2026-06-12-sales-evolution-homepage.md")),
    ).toBe(false);
  });
});
