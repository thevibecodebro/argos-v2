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
    expect(source).toContain("Do not bring back the hero eyebrow: `Sales standard installation + Argos platform`.");
    expect(source).not.toContain("Positioning phrase: `Sales standard installation + Argos platform`");
    expect(source).toContain("The coaching sets the standard. Argos reinforces it in the work.");
    expect(source).toContain("Public nav order: `Product`, `Coaching`, `Standard`, `System`, `Roles`, `Demo`.");
    expect(source).toContain("Problem card headline: `Coaching only counts if it changes the next call.`");
    expect(source).toContain("Problem card body: `Most teams leave the meeting nodding.");
    expect(source).toContain("Canonical Flow");
    expect(source).toContain("Product screenshot carousel");
    expect(source).toContain("buyer-facing coaching outcomes");
    expect(source).toContain("no standalone section title");
    expect(source).toContain("no standalone section subtitle");
    expect(source).toContain("no card paragraph copy");
    expect(source).toContain("full Argos product loop");
    expect(source).toContain("line-broken benefit headlines");
    expect(source).toContain("Eight-card product screenshot flow");
    expect(source).toContain("Dashboard: Know where to coach / before the week gets away.");
    expect(source).toContain("Calls: Start with the conversations / your team actually had.");
    expect(source).toContain("Scorecards: Score the moments / that make or break the sale.");
    expect(source).toContain("Leaderboard: Track whether the standard / is spreading across the team.");
    expect(source).toContain("Call review");
    expect(source).toContain("Scorecards");
    expect(source).toContain("Highlights");
    expect(source).toContain("Training");
    expect(source).toContain("Roleplay");
    expect(source).toContain("Team");
    expect(source).toContain("Leaderboard");
    expect(source).toContain("Start with the conversations / your team actually had.");
    expect(source).not.toContain("Hero proof strip:");
    expect(source).not.toContain("Product section label: `Operating feed`");
    expect(source).not.toContain("animated operating feed cards only");
    expect(source).not.toContain("One call becomes five visible handoffs.");
    expect(source).not.toContain("Product section label: `Product in motion`");
    expect(source).toContain("How The Standard Gets Installed");
    expect(source).toContain("Install the sales standard");
    expect(source).toContain("Argos scores real calls against it");
    expect(source).toContain("Managers reinforce it every week");
    expect(source).toContain("For Owners");
    expect(source).toContain("For Managers");
    expect(source).toContain("For Reps");
    expect(source).toContain("Role cards: For Owners, For Managers, For Reps.");
    expect(source).toContain("CTA: `Book Demo`");
    expect(source).not.toContain("CTA: `Book the coaching walkthrough`");
    expect(source).toContain("call review -> scorecards and rubrics -> coaching flags -> training assignments -> roleplay practice -> manager dashboards");
    expect(source).toContain("Product loop card format: number, label, explanatory paragraph.");
    expect(source).toContain("Do not add amber proof lines");
    expect(source).toContain("Do not copy Fathom assets, Fathom branding, or Fathom copy.");
    expect(source).toContain("Do not bring back the hero proof strip");
    expect(source).toContain("Do not bring back the operating feed card stack or carousel.");
    expect(source).toContain("Do not bring back a standalone product section title");
    expect(source).toContain("Do not describe the product screenshot carousel with backend-facing labels");
    expect(source).toContain("Do not reuse the old repeated dashboard crop assets.");
    expect(source).not.toContain("Sales standard system: install the standard once; keep the team honest every week.");
    expect(source).toContain("Do not bring back the marquee strip.");
    expect(source).not.toContain("Reviewed / Scored / Queued");
    expect(source).not.toContain("Zoom and GoHighLevel");
    expect(source).not.toContain("Founder-led sales coaching + Argos platform");
    expect(source).not.toContain("most sales coaching dies between meetings");
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
