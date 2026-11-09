import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeContracts = [
  {
    path: "../components/call-review-workspace.tsx",
    primaryObjects: ["{children}"],
    route: "call detail",
    routeMarker: 'data-call-detail-route="review-bench"',
  },
  {
    path: "../app/(authenticated)/roleplay/page.tsx",
    primaryObjects: ["RoleplayPanel"],
    route: "roleplay",
    routeMarker: 'data-roleplay-route="operational-workspace"',
  },
  {
    path: "../components/roleplay-history-panel.tsx",
    primaryObjects: ["<table"],
    route: "roleplay history",
    routeMarker: 'aria-label="Completed roleplay sessions"',
  },
  {
    path: "../components/leaderboard-page-view.tsx",
    primaryObjects: ['data-forge-table="true"'],
    route: "leaderboard",
    routeMarker: 'data-leaderboard-route="rank-table"',
  },
  {
    path: "../components/training/training-pages.tsx",
    primaryObjects: ["ForgeTableShell"],
    route: "training team",
    routeMarker: 'data-training-route="team-progress"',
  },
];

describe("remaining authenticated route readability", () => {
  it.each(routeContracts)("$route keeps the primary work object directly after toolbar chrome", ({
    path,
    primaryObjects,
    routeMarker,
  }) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");

    expect(source).toContain(routeMarker);
    primaryObjects.forEach((primaryObject) => {
      expect(source).toContain(primaryObject);
    });
    expect(source).not.toContain("OperationalMetricStrip");
  });

  it("leaderboard removes no-op view and filter chrome", () => {
    const source = readFileSync(
      new URL("../components/leaderboard-page-view.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('data-leaderboard-route="rank-table"');
    expect(source).toContain('data-forge-table="true"');
    expect(source).not.toContain("ForgeSegmentedTabs");
    expect(source).not.toContain("ForgeSegmentedTab");
    expect(source).not.toContain("?view=");
    expect(source).not.toContain("Period: Last 30 days");
    expect(source).not.toContain("Team: All teams");
    expect(source).not.toContain("Role: All roles");
  });

  it("keeps ledgers without automatically selecting the first record", () => {
    const leaderboard = readFileSync(
      new URL("../components/leaderboard-page-view.tsx", import.meta.url),
      "utf8",
    );
    const history = readFileSync(
      new URL("../components/roleplay-history-panel.tsx", import.meta.url),
      "utf8",
    );
    const trainingTeam = readFileSync(
      new URL("../components/training/training-pages.tsx", import.meta.url),
      "utf8",
    );

    expect(leaderboard).toContain('data-forge-table="true"');
    expect(history).toContain('<table');
    expect(trainingTeam).toContain('data-forge-table="true"');
    expect(leaderboard).not.toContain('data-selected-object-drawer="true"');
    expect(history).not.toContain('data-selected-object-drawer="true"');
    expect(trainingTeam).not.toContain('data-selected-object-drawer="true"');
  });
});
