import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function readAppFile(relativePath: string) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("primary route hero removal", () => {
  it("switches page-frame routes to hidden headers", async () => {
    const [team, leaderboard, training] = await Promise.all([
      readAppFile("app/(authenticated)/team/page.tsx"),
      readAppFile("app/(authenticated)/leaderboard/page.tsx"),
      readAppFile("app/(authenticated)/training/page.tsx"),
    ]);

    expect(team).toContain('headerMode="hidden"');
    expect(team).toContain('label: "Open leaderboard"');

    expect(leaderboard).toContain('headerMode="hidden"');
    expect(leaderboard).toContain('label: "Open team view"');

    expect(training).toContain('headerMode="hidden"');
    expect(training).toContain('label: "Open highlights"');
  });

  it("keeps default page-frame headings on out-of-scope routes", async () => {
    const [settings, notifications, upload, repProfile, teamLoading] = await Promise.all([
      readAppFile("app/(authenticated)/settings/page.tsx"),
      readAppFile("app/(authenticated)/notifications/page.tsx"),
      readAppFile("app/(authenticated)/upload/page.tsx"),
      readAppFile("app/(authenticated)/team/[repId]/page.tsx"),
      readAppFile("app/(authenticated)/team/loading.tsx"),
    ]);

    expect(settings).toContain('title="Account"');
    expect(notifications).toContain('title="Notifications"');
    expect(upload).toContain('title="Upload Call"');
    expect(repProfile).toContain('title="Rep Profile"');
    expect(teamLoading).toContain('title="Team"');
  });
});
