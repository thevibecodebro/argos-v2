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

const themedSettingsChromeFiles = [
  "../app/(authenticated)/settings/page.tsx",
  "../app/(authenticated)/settings/settings-operational-layout.tsx",
  "../components/settings/workspace-branding-panel.tsx",
  "../components/settings/settings-readability.tsx",
  "../components/operational-workspace.tsx",
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

  it("keeps long settings metadata readable on narrow screens", () => {
    const readability = readFileSync(
      new URL("../components/settings/settings-readability.tsx", import.meta.url),
      "utf8",
    );

    expect(readability).toContain('data-settings-meta-row="true"');
    expect(readability).toContain('data-settings-meta-value="true"');
    expect(readability).toContain("min-w-0");
    expect(readability).toContain("break-all");
  });

  it("keeps the docked settings rail compact instead of oversized", () => {
    const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(globals).toContain("--forge-docked-secondary-width: 13.25rem");
    expect(globals).toContain("min-height: 2.25rem");
    expect(globals).toContain("padding-block: 0.5rem");
    expect(globals).toContain("box-shadow: none");
    expect(globals).not.toContain("box-shadow: 4px 0 24px");
  });

  it("does not hard-code dark resources in themed settings chrome", () => {
    for (const path of themedSettingsChromeFiles) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");

      expect(source, path).not.toContain("rgba(16, 9, 7");
      expect(source, path).not.toContain("var(--forge-shadow)_72%");
      expect(source, path).not.toContain("var(--forge-shadow)_88%");
      expect(source, path).not.toContain("text-white");
    }
  });
});
