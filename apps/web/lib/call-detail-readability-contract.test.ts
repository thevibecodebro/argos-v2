import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("call detail readability contract", () => {
  it("uses a transcript and evidence workbench instead of tabbed dashboard chrome", () => {
    const source = readFileSync(
      new URL("../components/call-detail-panel.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('data-call-detail-workbench="transcript-evidence"');
    expect(source).toContain('data-call-transcript-primary="true"');
    expect(source).toContain('data-call-evidence-panel="true"');
    expect(source).toContain('data-call-coaching-pane="true"');
    expect(source).not.toContain("ForgeSegmentedTabs");
    expect(source).not.toContain("ForgeSegmentedTab");
    expect(source).not.toContain("activeWorkbenchTab");
  });
});
