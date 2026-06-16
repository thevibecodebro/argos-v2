import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeContracts = [
  {
    path: "../app/(authenticated)/calls/[id]/page.tsx",
    primaryObjects: ["CallDetailPanel"],
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
    path: "../app/(authenticated)/roleplay/history/page.tsx",
    primaryObjects: ["ForgeTableShell"],
    route: "roleplay history",
    routeMarker: 'data-roleplay-route="history"',
  },
  {
    path: "../app/(authenticated)/leaderboard/page.tsx",
    primaryObjects: ['data-forge-table="true"'],
    route: "leaderboard",
    routeMarker: 'data-leaderboard-route="rank-table"',
  },
  {
    path: "../app/(authenticated)/training/team/page.tsx",
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
      new URL("../app/(authenticated)/leaderboard/page.tsx", import.meta.url),
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

  it("keeps table routes table-first with selected-object drawer semantics", () => {
    const leaderboard = readFileSync(
      new URL("../app/(authenticated)/leaderboard/page.tsx", import.meta.url),
      "utf8",
    );
    const history = readFileSync(
      new URL("../app/(authenticated)/roleplay/history/page.tsx", import.meta.url),
      "utf8",
    );
    const trainingTeam = readFileSync(
      new URL("../app/(authenticated)/training/team/page.tsx", import.meta.url),
      "utf8",
    );

    expect(leaderboard).toContain('data-forge-table="true"');
    expect(history).toContain('data-forge-table="true"');
    expect(trainingTeam).toContain('data-forge-table="true"');
    expect(leaderboard).toContain('data-selected-object-drawer="true"');
    expect(history).toContain('data-selected-object-drawer="true"');
    expect(trainingTeam).toContain('data-selected-object-drawer="true"');
  });
});
