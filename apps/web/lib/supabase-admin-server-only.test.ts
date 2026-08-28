import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Supabase service-role admin client", () => {
  it("is guarded against accidental client imports", () => {
    const source = readFileSync(new URL("./supabase/admin.ts", import.meta.url), "utf8");

    expect(source).toMatch(/^import "server-only";/);
  });
});
