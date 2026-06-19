import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../..");
const webRoot = join(__dirname, "..");

function walk(dir: string, exts: string[]): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "public" || entry.name === "node_modules") return [];
      return walk(full, exts);
    }
    return exts.some((ext) => entry.name.endsWith(ext)) ? [full] : [];
  });
}

// The brand gold is #d8aa68. These are the historical drifted literals that
// must always flow through var(--forge-gold) instead.
const driftedGoldLiterals = [
  /rgba?\(\s*241\s*,\s*191\s*,\s*123/i,
  /rgba?\(\s*216\s*,\s*170\s*,\s*104/i,
];

const authenticatedSurfaceFiles = [
  "apps/web/app/(authenticated)/calls/calls-filters.tsx",
  "apps/web/app/(authenticated)/calls/page.tsx",
  "apps/web/app/(authenticated)/dashboard/page.tsx",
  "apps/web/app/(authenticated)/highlights/page.tsx",
  "apps/web/app/(authenticated)/leaderboard/page.tsx",
  "apps/web/app/(authenticated)/notifications/page.tsx",
  "apps/web/app/(authenticated)/roleplay/page.tsx",
  "apps/web/app/(authenticated)/team/error.tsx",
  "apps/web/app/(authenticated)/team/[repId]/not-found.tsx",
  "apps/web/app/(authenticated)/team/[repId]/loading.tsx",
  "apps/web/app/(authenticated)/team/[repId]/page.tsx",
  "apps/web/app/(authenticated)/team/loading.tsx",
  "apps/web/app/(authenticated)/team/page.tsx",
  "apps/web/app/(authenticated)/training/page.tsx",
  "apps/web/app/(authenticated)/upload/page.tsx",
  "apps/web/components/call-detail-panel.tsx",
  "apps/web/components/feedback-widget.tsx",
  "apps/web/components/forge-dialog.tsx",
  "apps/web/components/legacy-shell.tsx",
  "apps/web/components/integrations-settings-panel.tsx",
  "apps/web/components/notifications-panel.tsx",
  "apps/web/components/onboarding-panel.tsx",
  "apps/web/components/platform/platform-shell.tsx",
  "apps/web/components/role-onboarding-guide.tsx",
  "apps/web/components/app-shell.tsx",
  "apps/web/components/roleplay-panel.tsx",
  "apps/web/components/settings/account-panel.tsx",
  "apps/web/components/settings/compliance-panel.tsx",
  "apps/web/components/settings/integrations-panel.tsx",
  "apps/web/components/settings/people-panel.tsx",
  "apps/web/components/settings/permissions-panel.tsx",
  "apps/web/components/settings/rubrics-panel.tsx",
  "apps/web/components/settings/teams-panel.tsx",
  "apps/web/components/team/team-views.tsx",
  "apps/web/components/training-panel.tsx",
  "apps/web/components/upload-call-panel.tsx",
  "apps/web/components/training/training-loading-shell.tsx",
  "apps/web/components/training/training-course-shell.tsx",
  "apps/web/components/training/training-manager-ai-tools.tsx",
  "apps/web/components/training/training-manager-modal.tsx",
  "apps/web/components/training/training-manager-status-band.tsx",
  "apps/web/components/training/training-module-stage.tsx",
  "apps/web/components/training/training-module-toc.tsx",
  "apps/web/components/training/training-quiz-editor.tsx",
] as const;

const forbiddenLegacyForgeBreakers = [
  /#74b1ff/i,
  /#6dddff/i,
  /#54a3ff/i,
  /#002f59/i,
  /#002345/i,
  /#45484f/i,
  /#10131a/i,
  /#161a21/i,
  /#22262f/i,
  /#1c2028/i,
  /#000000/i,
  /rgba\(\s*116\s*,\s*177\s*,\s*255/i,
  /rgba\(\s*109\s*,\s*221\s*,\s*255/i,
  /border-l-[24]/,
  /border-r-[24]/,
  /bg-gradient-to-r\s+from-\[#74b1ff\]/,
  /backdrop-blur(?:-\w+|\[)/,
  /\b(?:bg|border|hover:border|text|placeholder:text)-blue-/,
  /\b(?:bg|border|hover:border|text|placeholder:text)-slate-/,
] as const;

const forbiddenDarkSurfaceResources = [
  /var\(--forge-shadow\)/,
  /rgba\(\s*16\s*,\s*9\s*,\s*7/i,
  /rgba\(\s*5\s*,\s*3\s*,\s*2/i,
  /text-white/,
  /border-white/,
  /bg-\[#0c1629\]/,
] as const;

describe("authenticated forge token coverage", () => {
  it("keeps remaining authenticated feature surfaces out of the legacy blue command-center palette", () => {
    const violations = authenticatedSurfaceFiles.flatMap((file) => {
      const source = readFileSync(join(repoRoot, file), "utf8");

      return forbiddenLegacyForgeBreakers.flatMap((pattern) => {
        const match = source.match(pattern);
        return match ? [`${file}: ${match[0]}`] : [];
      });
    });

    expect(violations).toEqual([]);
  });

  it("routes all accent gold through var(--forge-gold) instead of drifted literals", () => {
    const surfaces = [
      ...walk(join(webRoot, "components"), [".tsx", ".css"]),
      ...walk(join(webRoot, "app/(authenticated)"), [".tsx", ".css"]),
      join(webRoot, "app/globals.css"),
    ];

    const violations = surfaces.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return driftedGoldLiterals.flatMap((pattern) => {
        const match = source.match(pattern);
        return match ? [`${file.replace(`${webRoot}/`, "")}: ${match[0]}`] : [];
      });
    });

    expect(violations).toEqual([]);
  });

  it("routes authenticated feature surfaces through semantic theme resources instead of dark-only bases", () => {
    const violations = authenticatedSurfaceFiles.flatMap((file) => {
      const source = readFileSync(join(repoRoot, file), "utf8");

      return forbiddenDarkSurfaceResources.flatMap((pattern) => {
        const match = source.match(pattern);
        return match ? [`${file}: ${match[0]}`] : [];
      });
    });

    expect(violations).toEqual([]);
  });
});
