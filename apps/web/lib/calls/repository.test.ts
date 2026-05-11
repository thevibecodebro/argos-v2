import { describe, expect, it, vi } from "vitest";
import { DrizzleCallsRepository } from "./repository";
import { SupabaseCallsRepository } from "./supabase-repository";

describe("calls repositories", () => {
  it("does not query Drizzle when scoped rep ids are empty", async () => {
    const db = {
      select: vi.fn(() => {
        throw new Error("empty rep scope must not query Drizzle");
      }),
    };
    const repository = new DrizzleCallsRepository(db as never);

    await expect(repository.findCallsByRepIds([], { limit: 25, offset: 0 })).resolves.toEqual({
      calls: [],
      total: 0,
    });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("does not query Supabase when scoped rep ids are empty", async () => {
    const supabase = {
      from: vi.fn(() => {
        throw new Error("empty rep scope must not query Supabase");
      }),
    };
    const repository = new SupabaseCallsRepository(supabase as never);

    await expect(repository.findCallsByRepIds([], { limit: 25, offset: 0 })).resolves.toEqual({
      calls: [],
      total: 0,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
