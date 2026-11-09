import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard readability", () => {
  it("keeps stat strip labels readable in light workspace themes", () => {
    const source = readFileSync(
      new URL("../components/dashboard-workspace.tsx", import.meta.url),
      "utf8",
    );
    const statStrip = source.match(
      /data-dashboard-stat-strip="true"[\s\S]+?<\/dl>/,
    )?.[0];

    expect(statStrip).toBeDefined();
    expect(source.indexOf('data-dashboard-queue-table="true"')).toBeLessThan(source.indexOf('data-dashboard-summary="true"'));
    expect(source).toContain("Performance summary");
    const css = readFileSync(new URL("../components/review-workspace.module.css", import.meta.url), "utf8");
    expect(css).toContain(".statStrip dt { font-size:12px; color:var(--forge-muted)");
    expect(statStrip).not.toContain("text-[var(--forge-faint)]");
  });
});
