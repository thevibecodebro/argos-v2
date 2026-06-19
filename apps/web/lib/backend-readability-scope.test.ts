import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("..", import.meta.url).pathname;
const authenticatedRoot = join(repoRoot, "app/(authenticated)");

function collectFiles(
  dir: string,
  matcher: (path: string) => boolean,
  result: string[] = [],
) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      collectFiles(path, matcher, result);
    } else if (matcher(path)) {
      result.push(path);
    }
  }
  return result;
}

describe("authenticated backend readability scope", () => {
  it("keeps the existing primary navigation route set and labels", () => {
    const source = readFileSync(
      new URL("../components/app-shell.tsx", import.meta.url),
      "utf8",
    );
    // Scope to the grouped primary-rail declaration (not the bottom tab bar).
    const navSource = source.slice(
      source.indexOf("const navGroups"),
      source.indexOf("const bottomTabs"),
    );
    const primaryNavigationEntries = Array.from(
      navSource.matchAll(
        /\{\s*href:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*icon:\s*"([^"]+)"\s*\}/g,
      ),
      ([, href, label, icon]) => ({ href, icon, label }),
    );

    expect(primaryNavigationEntries).toEqual([
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/calls", label: "Calls", icon: "library_books" },
      { href: "/highlights", label: "Highlights", icon: "auto_awesome" },
      { href: "/training", label: "Training", icon: "school" },
      { href: "/roleplay", label: "Roleplay", icon: "psychology" },
      { href: "/team", label: "Team", icon: "group" },
      { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
      { href: "/notifications", label: "Notifications", icon: "notifications" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ]);
    expect(source).not.toContain('label: "Today"');
    expect(source).not.toContain('label: "Coaching"');
  });

  it("keeps route pages free of decorative metric strips", () => {
    const routeFiles = collectFiles(
      authenticatedRoot,
      (path) => path.endsWith("page.tsx") || path.endsWith("loading.tsx"),
    );

    for (const file of routeFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, relative(repoRoot, file)).not.toContain(
        "OperationalMetricStrip",
      );
      expect(source, relative(repoRoot, file)).not.toContain(
        'data-operational-metric-strip="true"',
      );
    }
  });
});
