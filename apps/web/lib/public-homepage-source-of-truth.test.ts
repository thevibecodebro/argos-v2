import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../../..");

describe("public homepage source of truth", () => {
  it("keeps one canonical Argos homepage direction and removes superseded narratives", () => {
    const sourcePath = resolve(repoRoot, "docs/public-homepage-source-of-truth.md");
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain("Canonical public homepage direction");
    expect(source).toContain("Build a sales team that actually follows the playbook.");
    expect(source).toContain("Sales standard installation + Argos platform");
    expect(source).toContain("The coaching sets the standard. Argos reinforces it in the work.");
    expect(source).toContain("Call review -> Rubrics scored -> Training assigned -> Roleplay tracked -> Manager dashboard");
    expect(source).toContain("Canonical Flow");
    expect(source).toContain("Product in motion");
    expect(source).toContain("How The Standard Gets Installed");
    expect(source).toContain("Install the sales standard");
    expect(source).toContain("Argos scores real calls against it");
    expect(source).toContain("Managers reinforce it every week");
    expect(source).toContain("For Owners");
    expect(source).toContain("For Managers");
    expect(source).toContain("For Reps");
    expect(source).toContain("Role cards: For Owners, For Managers, For Reps.");
    expect(source).toContain("call review -> scorecards and rubrics -> coaching flags -> training assignments -> roleplay practice -> manager dashboards");
    expect(source).toContain("Do not copy Fathom assets, Fathom branding, or Fathom copy.");
    expect(source).not.toContain("Sales standard system: install the standard once; keep the team honest every week.");
    expect(source).toContain("Do not bring back the marquee strip.");
    expect(source).not.toContain("Reviewed / Scored / Queued");
    expect(source).not.toContain("Zoom and GoHighLevel");
    expect(source).not.toContain("Founder-led sales coaching + Argos platform");
    expect(source).not.toContain("The founder teaches the standard");
    expect(source).not.toContain("Founder teaches the standard");
    expect(source).not.toContain("For Founders");
    expect(source).not.toContain("the founder helps identify the highest-value coaching moment");
    expect(source).not.toContain("founder review -> coaching moment");
    expect(source).not.toContain("call review -> scored evidence -> coaching moment -> roleplay drill -> next call -> progress signal");
    expect(source).not.toContain("Progress signal");
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
