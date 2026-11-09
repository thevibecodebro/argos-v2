import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeContracts = [
  {
    path: "../components/highlights-workspace.tsx",
    primaryObject: 'data-highlights-library="evidence-list"',
    route: "highlights",
    routeMarker: 'data-highlights-layout="evidence-inbox"',
    selectedDrawer: false,
  },
  {
    path: "../components/team/team-pages.tsx",
    primaryObject: "TeamRosterView",
    route: "team",
    routeMarker: 'data-team-route="roster-first"',
    selectedDrawer: false,
  },
  {
    path: "../components/team/team-pages.tsx",
    primaryObject: "TeamRepProfileView",
    route: "rep profile",
    routeMarker: 'data-rep-profile-route="coaching-detail"',
    selectedDrawer: false,
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
      new URL("../components/highlights-workspace.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("No highlights yet");
    expect(source).toContain("Saved coaching moments from scored calls will appear here.");
  });
});
