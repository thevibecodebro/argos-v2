import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard readability", () => {
  it("keeps stat strip labels readable in light workspace themes", () => {
    const source = readFileSync(
      new URL("../app/(authenticated)/dashboard/page.tsx", import.meta.url),
      "utf8",
    );
    const statStrip = source.match(
      /data-dashboard-stat-strip="true"[\s\S]+?<\/details>/,
    )?.[0];

    expect(statStrip).toBeDefined();
    expect(source.indexOf('data-dashboard-queue-table="true"')).toBeLessThan(source.indexOf('data-dashboard-summary="true"'));
    expect(source).toContain("Performance summary");
    expect(statStrip).toContain("text-[var(--forge-muted)]");
    expect(statStrip).not.toContain("text-[var(--forge-faint)]");
  });
});
