import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../..");

const authenticatedSurfaceFiles = [
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
  "apps/web/components/integrations-settings-panel.tsx",
  "apps/web/components/notifications-panel.tsx",
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
  "apps/web/components/training/training-manager-command-deck.tsx",
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
});
