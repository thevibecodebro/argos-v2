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

  it("preserves attempt count when manually requeueing failed processing jobs", async () => {
    const processingUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: "job-1",
          callId: "call-1",
          status: "pending",
          attemptCount: 2,
          maxAttempts: 3,
          nextRunAt: new Date("2026-04-03T00:15:00.000Z"),
          lockedAt: null,
          lockExpiresAt: null,
          lastStage: null,
          lastError: null,
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
          updatedAt: new Date("2026-04-03T00:15:00.000Z"),
        },
      ]),
    };
    const callUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    const tx = {
      update: vi.fn()
        .mockReturnValueOnce(processingUpdate)
        .mockReturnValueOnce(callUpdate),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const repository = new DrizzleCallsRepository(db as never);

    const job = await repository.retryCallProcessingJob("call-1");

    expect(job?.attemptCount).toBe(2);
    expect(processingUpdate.set).toHaveBeenCalled();
    expect(processingUpdate.set.mock.calls[0]?.[0]).not.toHaveProperty("attemptCount");
  });
});
