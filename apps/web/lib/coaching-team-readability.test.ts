import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeContracts = [
  {
    path: "../app/(authenticated)/highlights/page.tsx",
    primaryObject: 'data-forge-table="true"',
    route: "highlights",
    routeMarker: 'data-highlights-layout="evidence-inbox"',
    selectedDrawer: true,
  },
  {
    path: "../app/(authenticated)/team/page.tsx",
    primaryObject: "TeamRosterView",
    route: "team",
    routeMarker: 'data-team-route="roster-first"',
    selectedDrawer: true,
  },
  {
    path: "../app/(authenticated)/team/[repId]/page.tsx",
    primaryObject: "TeamRepProfileView",
    route: "rep profile",
    routeMarker: 'data-rep-profile-route="coaching-detail"',
    selectedDrawer: true,
  },
];

describe("coaching and team route readability", () => {
  it.each(routeContracts)("$route puts its primary object directly after toolbar chrome", ({
    path,
    primaryObject,
    routeMarker,
    selectedDrawer,
  }) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");

    expect(source).toContain(routeMarker);
    expect(source).toContain(primaryObject);
    if (selectedDrawer) {
      expect(source).toContain('data-selected-object-drawer="true"');
    }
    expect(source).not.toContain("OperationalMetricStrip");
  });

  it("standardizes the highlights empty state copy", () => {
    const source = readFileSync(
      new URL("../app/(authenticated)/highlights/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("No highlights yet");
    expect(source).toContain("Saved coaching moments from scored calls will appear here.");
  });
});
