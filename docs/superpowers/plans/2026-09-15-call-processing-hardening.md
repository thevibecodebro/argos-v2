# Call Processing Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make long-recording processing resumable and observable, preserving short-call behavior, tenant isolation, scoring, buyer profiles, and one completion notification.

**Architecture:** Keep the existing Postgres queue and worker. Add a versioned chunk manifest, durable transcript checkpoints, renewable fenced job leases, bounded per-chunk retries, and transactional finalization. Ship reliability before changing production chunk duration or concurrency.

**Tech Stack:** TypeScript, Node, FFmpeg, Drizzle/Postgres, Supabase, Vitest, Fly worker, Next.js web app.

**Spec:** The design contract and acceptance matrix in this document implement the September 15 conversation's agreed hardening direction. This is a proposed implementation plan; no runtime changes or deployment are included in creating it.

## Global Constraints

- Preserve manual upload and integration ingestion contracts, consent checks, tenant/capability checks, pinned rubric behavior, and existing call statuses.
- Keep production transcription concurrency at 1 for the first release. Keep the existing model, five-minute chunk target, and 120-second request timeout until the benchmark gate approves a separate configuration change.
- Do not automatically retry old failed calls or reprocess completed calls. Preserve Intero's completed “Discovery” result.
- Never infer that similarly named or equally sized uploads contain identical bytes. Reuse checkpoints only within their own call/job and matching processing fingerprint.
- Do not promise zero regressions or exactly-once provider billing. A crash after the provider responds but before the checkpoint commits can cause a repeated provider request.
- Logs contain operational metadata only, never transcript text, audio, signed URLs, raw provider bodies, or credentials.
- Source recordings and chunk transcripts follow the call's existing access and deletion/retention rules. Do not create permanent intermediate audio storage in the first release.
- Use additive migrations and a coordinated worker cutover. An old worker must never claim a new resumable job.

## Evidence and limits

Verified during the preceding investigation: the September 9 Intero job exhausted 3 attempts and stored `Request timed out after 120000ms` at `transcribe`. The earlier same-name/same-size upload completed with a 5,031-second transcript and ready buyer profile. Neither result proves the provider-side reason for the timeout.

Current source inspection:

- `packages/call-processing/src/openai.ts` and `fetch-timeout.ts`: a fixed 120-second deadline covers the request and response body; failures lose structured retry metadata.
- `apps/worker/src/media/chunk-audio.ts`: duration and size partitioning, maximum target 300 seconds, 24 MiB passed by the worker.
- `apps/worker/src/media/normalize-audio.ts`: duration is estimated from MP3 size at 32 kbps; FFmpeg output uses a size cap. Verify full audio coverage before relying on this estimate.
- `apps/worker/src/jobs/process-call-job.ts`: chunk transcripts live in memory; any failure restarts the job; scratch audio is removed in `finally`.
- `apps/worker/src/calls/repository.ts`: claims use `FOR UPDATE SKIP LOCKED`, a fixed 15-minute lease, and increment attempts on every claim. Mutations do not fence stale owners. A crashed final attempt can remain running and ineligible for reclaim.
- Final call persistence is transactional internally, but job completion and notification insertion are separate operations.

## Design contract

### Queue ownership and attempt semantics

Add nullable `processing_version` (legacy rows treated as 1), `lease_token`, `heartbeat_at`, `processing_started_at`, and `failure_count` to jobs. New work is version 2 only when the rollout switch permits it. Retain `attempt_count` as claim history for compatibility; version 2 eligibility uses explicit bounded failure policy, not the legacy three-claim predicate. This prevents normal retry scheduling and crash recovery from exhausting the job merely by claiming it.

A claim creates a fresh UUID lease token. Every checkpoint, retry schedule, status mutation, and finalization checks job ID, token, running status, and unexpired lease using database time. Return `lost_lease` on no match. Heartbeat every 30 seconds, keeping the current 15-minute lease duration initially. On renewal failure, abort outstanding media/provider operations and perform no result/status writes. Recovery replaces the token; the old worker cannot finalize even if it later receives a response.

Use a 6-hour maximum elapsed processing budget for version 2 initially, configurable and pinned on the job. Bound provider attempts per chunk at 3 total; bound preparation/profile/scoring failures separately at 3 per stage. Record claim history separately from these budgets. An exhausted or overdue orphan must transition to a visible terminal failure rather than remain running indefinitely.

### Durable state

Create a worker-only `call_processing_chunks` table with parent job FK `ON DELETE CASCADE`, integer index, exact start/end offsets, audio hash, manifest fingerprint, status (`pending`, `retrying`, `complete`, `failed`), attempt count, next retry time, structured error code, provider request ID, latency, transcript JSON, and timestamps. Unique `(job_id, manifest_fingerprint, chunk_index)`; require valid offsets, nonnegative counts, and complete rows to contain a validated transcript.

Create a worker-only `call_processing_checkpoints` table keyed by job and fingerprint for merged transcript, measured duration, optional buyer-profile output, optional evaluation, and pinned model/rubric/profile configuration. Cascade deletion from the parent job. Enable RLS and grant no anon/authenticated access; browser progress comes through the existing authorized calls repository, with no raw checkpoint exposure.

The fingerprint includes source bytes hash, normalization settings/version, exact chunk boundaries, transcription model/config, and transcript format version. Evaluation/profile checkpoints additionally bind to transcript hash and rubric/profile configuration. Source replacement, model change, or rubric change cannot silently reuse incompatible output. Pin these inputs when starting; a deliberate fresh run creates a new generation without overwriting the completed call until success.

First release stores transcripts, not intermediate audio. On a crash, regenerate audio deterministically from the source and skip provider calls for matching completed chunks. If only profile/scoring remains, use the merged transcript checkpoint and skip download/normalization entirely.

### Retry and completion semantics

Expose typed provider errors with category, HTTP status, retry-after delay, request ID, and elapsed time. Retry timeouts, network failures, 408, 429 rate limits, and 5xx. Treat invalid input, credentials, permission, unsupported model, and exhausted quota as terminal; test provider error-code distinctions rather than treating every 429 identically.

Schedule retries durably: jittered delays of 10–20 seconds and 30–60 seconds, respecting a longer valid provider Retry-After. If the next run exceeds the job deadline, terminate with a clear reason. Release the lease instead of sleeping through backoff, allowing other jobs to run. Resume from the failed chunk. No nested unbounded provider and whole-job retry loops.

Finalize result rows, scores/moments, job state, and the existing database notification in one fenced transaction. Add a nullable unique notification dedupe key for `(job_id, generation, recipient, completion_type)`; preserve unrelated notifications. A replay returns `already_complete`. No external messaging outbox is needed for the current database-only notification path.

Preserve current capability semantics: personality-only can complete without a score; scoring can continue if optional personality extraction fails; personality-only profile failure remains a failure. Recheck capabilities before finalization and before resumed provider work. Never expose a partial transcript as a completed result.

### Transcript quality

Maintain chronological offsets and validate chunk coverage (no gaps, truncation, or duplicate boundary content). Speaker labels returned independently for chunks are not globally stable identities. Preserve existing consumer format in this release; measure cross-chunk speaker correctness and block chunk-size optimization if quality worsens. A new speaker reconciliation model is separate scope, not an incidental retry refactor.

## File map

Existing files to modify:

- `packages/db/src/schema/callProcessingJobs.ts`, `notifications.ts`, `index.ts`: schema additions/exports.
- `apps/worker/src/calls/repository.ts`: fenced claim, recovery, checkpoint access and finalization.
- `apps/worker/src/jobs/process-call-job.ts`, `poll-call-processing-jobs.ts`, `apps/worker/src/index.ts`: resumable orchestration and shutdown.
- `apps/worker/src/env.ts`, `env.test.ts`: validated/pinned operational settings.
- `apps/worker/src/media/normalize-audio.ts`, `chunk-audio.ts`, `ffmpeg.ts`: accurate coverage and cancellation.
- `packages/call-processing/src/openai.ts`, `fetch-timeout.ts`, `index.ts`: configurable deadline, cancellation, typed failure metadata.
- `apps/web/lib/calls/repository.ts`, `apps/web/components/call-detail-panel.tsx`: authorized progress and safe retry wording.
- `fly.worker.toml`, `README.md`: rollout settings and runbook.

New files:

- `packages/db/src/schema/callProcessingChunks.ts`, `callProcessingCheckpoints.ts`.
- `apps/worker/src/calls/processing-checkpoints.ts`: checkpoint types/fingerprint validation.
- `apps/worker/src/jobs/job-lease.ts`: heartbeat, cancellation, loss-of-lease handling.
- `apps/worker/src/jobs/transcribe-chunks.ts`: durable chunk loop.
- `apps/worker/src/call-processing/provider-errors.test.ts`: shared provider adapter tests within the worker's existing Vitest discovery.
- Co-located `*.test.ts` files for new worker modules.
- `scripts/benchmark-call-processing.ts`: controlled fixture benchmark with aggregate metrics.
- Migration generated with `supabase migration new call_processing_checkpoints`; use its generated timestamp, not a guessed filename.

## Execution tasks

Each task follows write failing behavior test → run focused test → implement → rerun → inspect diff → commit only task files. Use an isolated `codex/` branch at execution time. Do not implement this whole plan in one commit.

### Task 1: Lock current happy-path contracts

Files: existing worker job/media/repository tests, `apps/web/lib/calls-upload-complete-route.test.ts`, `apps/web/lib/integrations/zoom-webhook.test.ts`, new sanitized fixture helpers under `apps/worker/src/test-support/`.

- [ ] Add a short recording fixture and a generated long audio fixture; production media never enters Git.
- [ ] Assert short-call completion, ordered transcript, pinned rubric scores/moments, profile-only completion with null score, optional-profile failure with successful scoring, and denied-capability rejection.
- [ ] Run `npm run test:worker` and capture baseline failures before changes. Run `npm run test:web -- --run lib/calls-upload-complete-route.test.ts lib/integrations/zoom-webhook.test.ts`.
- [ ] Commit baseline tests. Gate: existing valid outcomes remain explicit and reproducible.

### Task 2: Add checkpoint schema and fenced repository primitives

Files: schema files, generated migration, `calls/repository.ts`, `calls/processing-checkpoints.ts`, repository/security tests.

Proposed interfaces (new types are defined in `processing-checkpoints.ts`):

```ts
export type Lease = { jobId: string; token: string };
export type WriteOutcome = 'written' | 'lost_lease';
export type ChunkResult = {
  fingerprint: string; index: number; startSeconds: number; endSeconds: number;
  transcript: import('@argos-v2/call-processing').TranscriptLine[];
};
// Repository methods; all time comparisons use database time.
// renewLease(lease: Lease): Promise<WriteOutcome>
// saveChunk(lease: Lease, result: ChunkResult): Promise<WriteOutcome>
// releaseForRetry(lease: Lease, nextRunAt: Date): Promise<WriteOutcome>
```

- [ ] Write integration tests for two simultaneous claimers, stale-token write rejection, cascade deletion, fingerprint mismatch, and two-tenant read denial.
- [ ] Run `npm run test:worker -- src/calls/repository.test.ts src/security/rls-policies.test.ts src/security/managed-client-isolation.test.ts` against an isolated test database. Confirm database identity before any reset.
- [ ] Implement additive schema and parameterized guarded queries; update test schema setup alongside migration.
- [ ] Verify actual Postgres transaction/locking behavior, beyond any in-memory database test substitute.
- [ ] Run `npm run typecheck:db` and focused tests; commit. Gate: stale owner cannot write, tenant cannot read raw checkpoints.

### Task 3: Renew leases and recover interrupted jobs

Files: `job-lease.ts` and tests, repository, poller and tests, `index.ts`, environment files.

- [ ] Test a job lasting over 15 minutes under a fake clock, renewal failure, two-owner takeover, shutdown, and crash on final legacy attempt.
- [ ] Implement `withJobLease<T>(lease: Lease, work: (signal: AbortSignal) => Promise<T>): Promise<T>` in `job-lease.ts`; scope heartbeat lifetime to work and always clear it in `finally`.
- [ ] Thread cancellation through download, FFmpeg, provider calls and orchestration. Abort stale work; do not classify lease loss as a call failure.
- [ ] Implement version-aware orphan recovery and deadline enforcement. Keep legacy attempt behavior for legacy rows except the explicit orphan terminalization repair.
- [ ] Run `npm run test:worker -- src/jobs/job-lease.test.ts src/jobs/poll-call-processing-jobs.test.ts src/calls/repository.test.ts`; commit.

### Task 4: Preserve provider failure details and bounded retry decisions

Files: provider modules, `provider-errors.test.ts`, environment files.

- [ ] Mock slow response headers, slow response body, abort, 429 Retry-After, quota rejection, 503, 400, and 401. Assert no sensitive body appears in emitted errors/logs.
- [ ] Add `signal?: AbortSignal` and `timeoutMs?: number` to transcription input, preserving defaults and existing callers. Define/export `TranscriptionRequestError` with category, status, retryAfterMs, requestId, elapsedMs.
- [ ] Implement one retry classifier used by the chunk scheduler; no retries inside the low-level fetch helper.
- [ ] Validate timeout and retry configuration at startup; reject zero, negative, nonfinite, or unreasonable values.
- [ ] Run `npm run test:worker -- src/call-processing/provider-errors.test.ts src/env.test.ts`; commit.

### Task 5: Checkpoint and resume transcription

Files: `transcribe-chunks.ts`, checkpoint module/repository, orchestration and media tests.

- [ ] Add this behavioral scenario with a mocked provider: chunks 0 and 1 succeed; chunk 2 times out; resume completes 2 and 3. Assert provider call sequence is `[0, 1, 2, 2, 3]`, not `[0, 1, 2, 0, 1, 2, 3]`.
- [ ] Test process death after checkpoint commit, death before commit, exhausted retry budget, fingerprint mismatch, and cancellation during transcription.
- [ ] Implement deterministic manifest creation, completed-chunk lookup and guarded per-chunk persistence. Record attempts before dispatch. Release and schedule transient failures; terminate exhausted/invalid work.
- [ ] Measure audio duration using media metadata rather than byte-rate approximation; verify actual generated chunks and last audio sample coverage. Size-cap truncation must become explicit failure, never silent success. Use the existing bundled FFmpeg where possible; document any added probe dependency and pin it.
- [ ] Persist the merged transcript checkpoint only after all chunks validate. Resume later stages directly from it.
- [ ] Run `npm run test:worker -- src/jobs/transcribe-chunks.test.ts src/jobs/process-call-job.test.ts src/media/chunk-audio.test.ts src/media/normalize-audio.test.ts`; commit.

### Task 6: Checkpoint downstream work and finalize once

Files: checkpoint schema/repository, job orchestration, notification schema, repository/job tests.

- [ ] Test scoring timeout after successful transcription: retry makes zero transcription requests. Test profile output reuse with matching configuration.
- [ ] Test crash before finalization and replay after commit: one call result, expected score/moment counts, complete job, one notification.
- [ ] Implement profile/evaluation checkpoints and atomic fenced finalization by reusing the existing transactional score/moment replacement logic.
- [ ] Test capability revocation during processing, low-confidence profile (`needs_review`), profile-only null score, and optional profile failure. Preserve existing behavior exactly.
- [ ] Run focused repository/job tests and `npm run verify:worker`; commit.

### Task 7: Add operational evidence and user progress

Files: worker orchestration, calls web repository/detail panel and tests, README.

- [ ] Add structured events for stage/chunk start, checkpoint, retry, lease loss, recovery and completion. Include job ID, generation, chunk index/count, bytes/duration, model, attempt, elapsed time and request ID when available.
- [ ] Add an authorized progress DTO `{ completedChunks, totalChunks, retryAt, stage }` to existing call reads; return null for legacy jobs. Never query checkpoint JSON into client output.
- [ ] Test legacy rendering, chunk progress, waiting-to-retry, terminal failure, completion, and cross-tenant denial. Render “12 of 28 sections transcribed” rather than guessed percentages.
- [ ] Document a staff-only recovery procedure with dry-run, tenant/call verification, audit record and explicit selection; no public retry endpoint is required in this release.
- [ ] Run `npm run test:web -- --run lib/call-detail-panel.test.tsx` and browser-check the states in Codex in-app Browser on an isolated environment; commit.

### Task 8: Benchmark and release behind a gate

Files: benchmark script, README/runbook, worker configuration.

- [ ] Implement a fixture-only benchmark with explicit opt-in for live provider requests, isolated result destination, and configured spend/request limit. Never implicitly fetch or resubmit Intero media.
- [ ] Compare 300-, 180-, and 120-second targets one variable at a time with concurrency 1; then test a longer timeout on the chosen target. Compare concurrency 2 only after reliability and quality gates pass.
- [ ] Record completion rate, provider request count, retries, elapsed time, peak memory, measured cost (or clearly labeled estimate), text coverage and speaker consistency. Use at least 3 runs per candidate plus deterministic fault injection; this is a canary sample, not statistical proof of reliability.
- [ ] Run `npm run verify`, real Postgres migration/locking tests, and the full acceptance matrix below. Review diff and CI before release.
- [ ] Commit benchmark/runbook separately from any production configuration tuning. Gate: reliability release can ship with current settings even if tuning is inconclusive.

## Acceptance matrix

| Scenario | Required observable result |
| --- | --- |
| Short manual upload | Existing success route, correct transcript and applicable outputs; one notification |
| Long recording, all requests succeed | Full timeline covered; ordered transcript; all expected chunks checkpointed |
| Single chunk timeout | Retry only that chunk; prior completed chunks incur no new provider calls |
| Retry-After or 503 | Bounded persisted retry; other due jobs can run |
| Invalid credentials/input or quota exhausted | Clear terminal reason; no retry storm |
| Worker dies or lease expires | Replacement resumes; old token cannot mutate; no stuck exhausted job |
| Database fails after provider success | Possible repeat of that one uncommitted chunk documented; no duplicated final results |
| Profile/scoring fails | Saved transcript reused; existing optional-profile semantics preserved |
| Finalization replay | One result set and one completion notification |
| Capability revoked / call deleted | No unauthorized output persistence; checkpoints deleted with parent |
| Legacy pending, failed, complete rows | Pending work has explicit version routing; failed/complete rows remain untouched |
| Zoom and other existing ingestion origins | Existing metadata/source mappings and queue contracts pass regression suites |
| Silent/corrupt/oversized media | Explicit tested outcome; no silently truncated successful transcript |
| Speaker boundary / final chunk | No new attribution degradation, missing ending, duplicated text, or shifted timestamps |

## Deployment and rollback runbook

1. Record baseline queue/version counts and oldest job age. Apply additive migration, verify RLS and indexes in staging and production through the normal migration workflow.
2. Deploy web readers tolerant of missing progress. Pause claims and drain the old worker; if interruption is necessary, wait for old leases to expire before takeover. Do not run old and new claimers together.
3. Deploy the version-aware worker with version 2 enrollment disabled. Verify legacy short-call happy path and health first.
4. Enable version 2 only for a controlled canary organization/fixture. Keep current model/chunk/timeout/concurrency settings. Execute success, injected retry, restart, stale-owner and notification checks.
5. Expand enrollment only after acceptance passes. Release tuning as a separate measured change. Stop expansion for any isolation failure, missing transcript coverage, duplicate completion, stale-owner write, or unrecoverable queue state.
6. Rollback: disable new version 2 enrollment, pause/drain version 2 work, preserve checkpoint tables. Use the version-aware compatibility worker to serve version 1 jobs; do not redeploy an old claimant that ignores processing_version. Resume version 2 only after repair. Do not drop schema or reset completed calls.

## Completion evidence

The implementation report must distinguish code/test completion, migration application, deployed version, canary runtime result, and production rollout. Attach test commands/results, migration identity, worker release, benchmark output and safe job IDs. Creating this plan establishes none of those execution outcomes.
