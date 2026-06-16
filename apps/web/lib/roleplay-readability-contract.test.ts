import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("roleplay readability contract", () => {
  it("keeps roleplay in a simple practice workspace grammar", () => {
    const source = readFileSync(
      new URL("../components/roleplay-panel.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('data-roleplay-workspace="simple-practice"');
    expect(source).toContain('data-roleplay-transcript="simple-log"');
    expect(source).toContain('data-roleplay-scenario-list="true"');
    expect(source).not.toContain("backdropFilter");
    expect(source).not.toContain("blur(12px)");
    expect(source).not.toContain("font-black uppercase");
    expect(source).not.toContain("tracking-[0.2em]");
    expect(source).not.toContain("tracking-widest");
  });
});
