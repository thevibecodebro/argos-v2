import { eq, sql } from "drizzle-orm";
import { createDb, ghlCallImportsTable, organizationsTable, type ArgosDb } from "@argos-v2/db";
import { describe, expect, it } from "vitest";
import { GhlImportRepository } from "./repository";
import { discoverWorkerTestDatabaseUrl } from "../test-support/database-env";

const workerTestDatabaseUrl = await discoverWorkerTestDatabaseUrl();
const workerTestDb = workerTestDatabaseUrl ? createDb(workerTestDatabaseUrl) : null;

const describeWithDatabase = workerTestDatabaseUrl ? describe : describe.skip;

class RollbackSignal extends Error {}

async function ensureGhlCallImportsTable(db: ArgosDb) {
  await db.execute(sql`
    create temporary table ghl_call_imports (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null,
      location_id text not null,
      message_id text not null,
      conversation_id text,
      contact_id text,
      ghl_user_id text,
      call_id uuid,
      status text not null default 'pending' check (status in ('pending', 'running', 'retrying', 'imported', 'skipped', 'failed')),
      skipped_reason text,
      message_created_at timestamptz,
      attempt_count integer not null default 0,
      max_attempts integer not null default 3,
      next_run_at timestamptz not null default now(),
      locked_at timestamptz,
      lock_expires_at timestamptz,
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (org_id, location_id, message_id)
    ) on commit drop;
  `);
}

async function withRepositoryTransaction(
  run: (input: { db: ArgosDb; repository: GhlImportRepository; orgId: string }) => Promise<void>,
) {
  if (!workerTestDb) {
    throw new Error("Missing WORKER_TEST_DATABASE_URL or DATABASE_URL for repository integration tests");
  }

  try {
    await workerTestDb.transaction(async (tx) => {
      const transactionalDb = tx as unknown as ArgosDb;
      const repository = new GhlImportRepository(transactionalDb);
      const orgId = crypto.randomUUID();

      await ensureGhlCallImportsTable(transactionalDb);
      await transactionalDb.insert(organizationsTable).values({
        id: orgId,
        name: `GHL Org ${orgId.slice(0, 8)}`,
        slug: `ghl-org-${orgId.slice(0, 8)}`,
        plan: "pro",
      });

      await run({
        db: transactionalDb,
        repository,
        orgId,
      });

      throw new RollbackSignal();
    });
  } catch (error) {
    if (!(error instanceof RollbackSignal)) {
      throw error;
    }
  }
}

describeWithDatabase("GhlImportRepository", () => {
  it("reclaims expired running imports as a new leased attempt", async () => {
    await withRepositoryTransaction(async ({ db, repository, orgId }) => {
      const [importRecord] = await db
        .insert(ghlCallImportsTable)
        .values({
          orgId,
          locationId: "loc-1",
          messageId: "msg-expired",
          status: "running",
          attemptCount: 1,
          lockedAt: new Date("2026-06-18T09:40:00.000Z"),
          lockExpiresAt: new Date("2026-06-18T09:55:00.000Z"),
          nextRunAt: new Date("2026-06-18T09:40:00.000Z"),
        })
        .returning({ id: ghlCallImportsTable.id });

      const claimed = await repository.claimNextGhlCallImport(
        new Date("2026-06-18T10:00:00.000Z"),
      );

      expect(claimed?.id).toBe(importRecord.id);
      expect(claimed?.status).toBe("running");
      expect(claimed?.attemptCount).toBe(2);

      const [refreshed] = await db
        .select({
          lockedAt: ghlCallImportsTable.lockedAt,
          lockExpiresAt: ghlCallImportsTable.lockExpiresAt,
        })
        .from(ghlCallImportsTable)
        .where(eq(ghlCallImportsTable.id, importRecord.id));

      expect(refreshed?.lockedAt).toEqual(new Date("2026-06-18T10:00:00.000Z"));
      expect(refreshed?.lockExpiresAt).toEqual(new Date("2026-06-18T10:15:00.000Z"));
    });
  });

  it("does not reclaim running imports while their lease is still active", async () => {
    await withRepositoryTransaction(async ({ db, repository, orgId }) => {
      await db.insert(ghlCallImportsTable).values({
        orgId,
        locationId: "loc-1",
        messageId: "msg-active",
        status: "running",
        attemptCount: 1,
        lockedAt: new Date("2026-06-18T09:55:00.000Z"),
        lockExpiresAt: new Date("2026-06-18T10:10:00.000Z"),
        nextRunAt: new Date("2026-06-18T09:55:00.000Z"),
      });

      const claimed = await repository.claimNextGhlCallImport(
        new Date("2026-06-18T10:00:00.000Z"),
      );

      expect(claimed).toBeNull();
    });
  });

  it("does not reclaim imports that have exhausted the retry budget", async () => {
    await withRepositoryTransaction(async ({ db, repository, orgId }) => {
      await db.insert(ghlCallImportsTable).values({
        orgId,
        locationId: "loc-1",
        messageId: "msg-exhausted",
        status: "running",
        attemptCount: 3,
        maxAttempts: 3,
        lockedAt: new Date("2026-06-18T09:40:00.000Z"),
        lockExpiresAt: new Date("2026-06-18T09:55:00.000Z"),
        nextRunAt: new Date("2026-06-18T09:40:00.000Z"),
      });

      const claimed = await repository.claimNextGhlCallImport(
        new Date("2026-06-18T10:00:00.000Z"),
      );

      expect(claimed).toBeNull();
    });
  });
});
