import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsFiles = [
  "../components/settings/account-panel.tsx",
  "../components/settings/compliance-panel.tsx",
  "../components/settings/integrations-panel.tsx",
  "../components/settings/people-panel.tsx",
  "../components/settings/teams-panel.tsx",
  "../components/settings/permissions-panel.tsx",
  "../components/settings/rubrics-panel.tsx",
];

describe("settings readability contract", () => {
  it("keeps settings panels in configuration-workspace grammar", () => {
    for (const path of settingsFiles) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");

      expect(source, path).not.toContain("font-black uppercase");
      expect(source, path).not.toContain("tracking-[0.28em]");
      expect(source, path).not.toContain("tracking-[0.24em]");
      expect(source, path).not.toContain("tracking-[0.22em]");
      expect(source, path).not.toContain("tracking-[0.2em]");
      expect(source, path).not.toContain("tracking-[0.3em]");
      expect(source, path).not.toContain("rounded-3xl");
      expect(source, path).not.toContain("grid-cols-3");
    }
  });

  it("uses shared settings readability primitives", () => {
    const workbench = readFileSync(
      new URL("../components/settings/settings-workbench.tsx", import.meta.url),
      "utf8",
    );
    const account = readFileSync(
      new URL("../components/settings/account-panel.tsx", import.meta.url),
      "utf8",
    );
    const people = readFileSync(
      new URL("../components/settings/people-panel.tsx", import.meta.url),
      "utf8",
    );

    expect(workbench).toContain("data-settings-editor-workbench");
    expect(account).toContain("SettingsSectionHeader");
    expect(people).toContain("SettingsTableShell");
  });
});
