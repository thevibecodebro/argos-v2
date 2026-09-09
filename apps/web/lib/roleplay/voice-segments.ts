import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, roleplayVoiceSegmentsTable } from "@argos-v2/db";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-repository-helpers";

export const VOICE_LEASE_MS = 30_000;

export type VoiceSegment = {
  sessionId: string;
  id: string;
  startedAt: Date | null;
  stoppedAt: Date | null;
  leaseExpiresAt: Date | null;
};
export interface VoiceSegmentsRepository {
  prepare(sessionId: string, id: string): Promise<VoiceSegment & { created: boolean }>;
  start(sessionId: string, id: string, now: Date): Promise<VoiceSegment>;
  stop(sessionId: string, id: string, now: Date): Promise<VoiceSegment>;
  heartbeat(sessionId: string, id: string, now: Date): Promise<VoiceSegment>;
  list(sessionId: string): Promise<VoiceSegment[]>;
}

export function createVoiceSegmentsRepository(): VoiceSegmentsRepository {
  if (process.env.DATABASE_URL) {
    const db = getDb();
    const table = roleplayVoiceSegmentsTable;
    const key = (sessionId: string, id: string) => and(eq(table.sessionId, sessionId), eq(table.id, id));
    const find = async (sessionId: string, id: string) => {
      const [row] = await db.select().from(table).where(key(sessionId, id));
      if (!row) throw new Error("Voice segment not found");
      return row;
    };
    return {
      async prepare(sessionId, id) {
        const inserted = await db.insert(table).values({ sessionId, id }).onConflictDoNothing().returning();
        return { ...await find(sessionId, id), created: inserted.length > 0 };
      },
      async start(sessionId, id, now) {
        await db.update(table).set({ startedAt: now, leaseExpiresAt: new Date(now.getTime() + VOICE_LEASE_MS) }).where(and(key(sessionId, id), isNull(table.startedAt), isNull(table.stoppedAt)));
        return find(sessionId, id);
      },
      async stop(sessionId, id, now) {
        // A tombstone also cancels a start request that has not reached prepare yet.
        await db.insert(table).values({ sessionId, id, stoppedAt: now }).onConflictDoNothing();
        await db.update(table).set({ stoppedAt: now }).where(and(key(sessionId, id), isNull(table.stoppedAt)));
        return find(sessionId, id);
      },
      async heartbeat(sessionId, id, now) {
        await db.update(table).set({ leaseExpiresAt: sql`clock_timestamp() + interval '30 seconds'` }).where(and(key(sessionId, id), isNull(table.stoppedAt), gt(table.leaseExpiresAt, sql`clock_timestamp()`)));
        return find(sessionId, id);
      },
      list: (sessionId) => db.select().from(table).where(eq(table.sessionId, sessionId)),
    };
  }
  const client: any = getSupabaseAdminClient();
  const table = () => client.from("roleplay_voice_segments");
  const normalize = (r: any): VoiceSegment => ({ sessionId: r.session_id, id: r.id, startedAt: r.started_at ? new Date(r.started_at) : null, stoppedAt: r.stopped_at ? new Date(r.stopped_at) : null, leaseExpiresAt: r.lease_expires_at ? new Date(r.lease_expires_at) : null });
  const checked = (result: any) => { if (result.error) throw new Error(result.error.message); return result.data; };
  const find = async (sessionId: string, id: string) => normalize(checked(await table().select("*").eq("session_id", sessionId).eq("id", id).single()));
  return {
    async prepare(sessionId, id) {
      const inserted = checked(await table().upsert({ session_id: sessionId, id }, { onConflict: "session_id,id", ignoreDuplicates: true }).select("*"));
      return { ...await find(sessionId, id), created: inserted.length > 0 };
    },
    async start(sessionId, id, now) {
      checked(await table().update({ started_at: now.toISOString(), lease_expires_at: new Date(now.getTime() + VOICE_LEASE_MS).toISOString() }).eq("session_id", sessionId).eq("id", id).is("started_at", null).is("stopped_at", null));
      return find(sessionId, id);
    },
    async stop(sessionId, id, now) {
      checked(await table().upsert({ session_id: sessionId, id, stopped_at: now.toISOString() }, { onConflict: "session_id,id", ignoreDuplicates: true }));
      checked(await table().update({ stopped_at: now.toISOString() }).eq("session_id", sessionId).eq("id", id).is("stopped_at", null));
      return find(sessionId, id);
    },
    async heartbeat(sessionId, id, now) {
      checked(await client.rpc("renew_roleplay_voice_segment", { p_session_id: sessionId, p_id: id }));
      return find(sessionId, id);
    },
    async list(sessionId) { return (checked(await table().select("*").eq("session_id", sessionId)) ?? []).map(normalize); },
  };
}

export type VoiceConsumer = (authUserId: string, input: { idempotencyKey: string; minutes: number; sessionId: string; source: "roleplay_realtime" }) => Promise<{ ok: true; data: { minutesDebited: number } } | { ok: false; status: number; error: string; code?: string }>;

/** Round the sum of active intervals once; minute ordinals make concurrent retries idempotent. */
export async function settleVoiceSegments(
  sessionId: string,
  segments: VoiceSegment[],
  authUserId: string,
  consume: VoiceConsumer,
) {
  const recorded = segments.filter((segment) => segment.startedAt && segment.stoppedAt);
  if (!recorded.length) return { ok: true as const, data: { minutesDebited: 0 } };
  const elapsedMs = recorded.reduce((total, segment) => {
    const start = segment.startedAt!.getTime();
    const end = Math.min(segment.stoppedAt!.getTime(), segment.leaseExpiresAt?.getTime() ?? start);
    return total + Math.max(0, end - start);
  }, 0);
  const minutes = Math.max(1, Math.ceil(elapsedMs / 60_000));
  // The session-level first minute is reserved by the start route. Replaying a
  // minute ordinal returns the original ledger debit, including concurrent stops.
  for (let ordinal = 2; ordinal <= minutes; ordinal += 1) {
    const result = await consume(authUserId, {
      idempotencyKey: `roleplay:${sessionId}:minute:${ordinal}`,
      minutes: 1,
      sessionId,
      source: "roleplay_realtime",
    });
    if (!result.ok) return result;
  }
  return { ok: true as const, data: { minutesDebited: minutes } };
}
