import { describe, expect, it, vi } from "vitest";
import { settleVoiceSegments, type VoiceSegment } from "./voice-segments";
const at = (seconds: number) => new Date(seconds * 1000);
const segment = (patch: Partial<VoiceSegment> = {}): VoiceSegment => ({ sessionId: "session", id: "segment1", startedAt: at(0), stoppedAt: at(60), leaseExpiresAt: at(80), ...patch });
const settle = (items: VoiceSegment[], consume: Parameters<typeof settleVoiceSegments>[3]) => settleVoiceSegments("session", items, "user", consume);
describe("voice interval settlement", () => {
  it("charges no additional minutes for a one-minute interval scored 30 minutes later", async () => {
    const consume = vi.fn();
    expect(await settle([segment()], consume)).toEqual({ ok: true, data: { minutesDebited: 1 } });
    expect(consume).not.toHaveBeenCalled();
  });
  it("preserves a session-level one minute minimum across ten five-second connections", async () => {
    const consume = vi.fn();
    const items = Array.from({ length: 10 }, (_, i) => segment({ id: `s${i}`, startedAt: at(i * 600), stoppedAt: at(i * 600 + 5), leaseExpiresAt: at(i * 600 + 30) }));
    expect(await settle(items, consume)).toEqual({ ok: true, data: { minutesDebited: 1 } });
    expect(consume).not.toHaveBeenCalled();
  });
  it("rounds five 61-second intervals to six minutes, with unique minute keys across concurrent retries", async () => {
    const ledger = new Map<string, number>();
    const consume = vi.fn(async (_user, input) => {
      if (!ledger.has(input.idempotencyKey)) ledger.set(input.idempotencyKey, input.minutes);
      return { ok: true as const, data: { minutesDebited: ledger.get(input.idempotencyKey)! } };
    });
    const items = Array.from({ length: 5 }, (_, i) => segment({ id: `s${i}`, startedAt: at(i * 600), stoppedAt: at(i * 600 + 61), leaseExpiresAt: at(i * 600 + 90) }));
    const results = await Promise.all([settle(items.slice(0, 2), consume), settle(items, consume), settle(items, consume)]);
    expect(results[1]).toEqual({ ok: true, data: { minutesDebited: 6 } });
    expect([...ledger.values()]).toEqual([1, 1, 1, 1, 1]); // Plus the shared first-minute reservation.
    expect(new Set(ledger.keys())).toEqual(new Set([2, 3, 4, 5, 6].map((n) => `roleplay:session:minute:${n}`)));
  });
  it("caps an abandoned connection at the last activity lease even if stopped hours later", async () => {
    const consume = vi.fn(async (_user, input) => ({ ok: true as const, data: { minutesDebited: input.minutes } }));
    const result = await settle([segment({ stoppedAt: at(36000), leaseExpiresAt: at(90) })], consume);
    expect(result).toEqual({ ok: true, data: { minutesDebited: 2 } });
    expect(consume.mock.calls[0][1].minutes).toBe(1);
  });
  it("does not count pending or still-active segments", async () => {
    const consume = vi.fn();
    await settle([segment({ startedAt: null, leaseExpiresAt: null }), segment({ stoppedAt: null })], consume);
    expect(consume).not.toHaveBeenCalled();
  });
  it("retries partially debited minute buckets without double billing", async () => {
    const ledger = new Set<string>();
    let fail = true;
    const consume = vi.fn(async (_user, input) => {
      if (input.idempotencyKey.endsWith(":3") && fail) { fail = false; return { ok: false as const, status: 402, error: "No minutes" }; }
      ledger.add(input.idempotencyKey);
      return { ok: true as const, data: { minutesDebited: 1 } };
    });
    const stopped = segment({ stoppedAt: at(121), leaseExpiresAt: at(150) });
    expect((await settle([stopped], consume)).ok).toBe(false);
    expect((await settle([stopped], consume)).ok).toBe(true);
    expect(ledger.size).toBe(2);
  });
});
