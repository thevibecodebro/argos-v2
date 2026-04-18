# Call Processing Pipeline Design

**Date:** 2026-04-17
**Status:** Approved
**Scope:** Replace synchronous call scoring with an async, worker-driven pipeline that can process long Zoom and uploaded recordings safely

---

## Overview

Argos currently scores calls inline inside the web request path. That worked for mocked scoring, but it is the wrong production shape now that real transcription and rubric scoring are enabled.

The main production problems are:

- OpenAI transcription has a practical per-request file limit of `25 MB`
- most Zoom cloud recordings exceed that limit before any preprocessing
- both the manual upload route and the Zoom webhook currently buffer full files in the web process
- transcription and scoring happen synchronously, which makes uploads slower and makes webhook processing fragile

The recommended design is to split the system into two responsibilities:

- `apps/web` handles ingestion only
- `apps/worker` handles all heavy processing asynchronously

This keeps the existing call detail, dashboard, and evaluation model intact while making long-file processing reliable enough for production.

---

## 1. Goals

- Make Zoom and manual call ingestion fast and resilient by removing transcription and scoring from the request path
- Support recordings that exceed the transcription API request limit by normalizing and chunking them in the worker
- Preserve the current rubric-based scoring output and UI contract
- Reuse the existing `calls` table and call detail views rather than introducing a parallel evaluation system
- Make retries, failures, and duplicate Zoom deliveries safe and observable

## 2. Non-Goals

- Introduce a third-party orchestration platform in this phase
- Build live or streaming transcription
- Redesign the call detail UI
- Add transcript editing or speaker-correction tooling
- Replace the current manual upload UX with direct browser-to-storage uploads in this phase

---

## 3. Current State

### Web app

The manual upload route in [`apps/web/app/api/calls/upload/route.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/app/api/calls/upload/route.ts) currently:

- validates the file
- reads the entire file into memory
- calls `uploadCall(...)`
- waits for real transcription and scoring before returning

The Zoom webhook in [`apps/web/lib/integrations/zoom-webhook.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/lib/integrations/zoom-webhook.ts) currently:

- downloads the preferred recording
- buffers it into memory
- calls the same scorer inline
- marks the call `failed` if anything in that inline path breaks

### Database

[`packages/db/src/schema/calls.ts`](/Users/thevibecodebro/Projects/argos-v2/packages/db/src/schema/calls.ts) already supports:

- call lifecycle status: `uploaded`, `transcribing`, `evaluating`, `complete`, `failed`
- persisted transcript JSON
- persisted evaluation category scores
- call moments
- unique `zoomRecordingId`

That means the user-facing call record can remain the system of record. What is missing is a durable processing-job layer.

### Worker app

[`apps/worker/src/index.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/worker/src/index.ts) is currently only a health server. There is no polling loop, job claim logic, media processing, or scoring execution in the worker yet.

---

## 4. Recommended Approach

Build a DB-backed async processing pipeline inside the existing repo.

### Why this approach

- it solves the `25 MB` transcription constraint without lying about a larger app-level limit
- it removes heavy audio/video work from the web app
- it fits the repo as it exists today because there is already a worker app to extend
- it avoids prematurely adding an external queue platform
- it gives the system explicit retries, leasing, and idempotency

### Alternatives considered

#### Keep processing inside `apps/web`

This is the smallest code change, but still leaves the system exposed to request timeout, webhook timeout, duplicated work, and memory pressure. It is not an acceptable production design for long Zoom recordings.

#### Introduce a managed workflow platform now

This is a good future option, but it adds an infrastructure dependency that the repo does not currently use. The worker + DB lease model is enough for this phase and keeps the processing core portable if orchestration changes later.

---

## 5. Architecture

### 5.1 Ingestion responsibilities in `apps/web`

The web app becomes responsible for:

- creating the `calls` row
- storing the original source asset in Supabase Storage
- creating or resetting a processing job
- returning immediately once the job is queued

The web app is no longer responsible for:

- transcription
- chunking
- rubric scoring
- retry decisions

### 5.2 Processing responsibilities in `apps/worker`

The worker becomes responsible for:

- claiming pending jobs with a lease
- downloading the stored source asset from Supabase Storage
- converting video to audio-only when needed
- normalizing the audio into a speech-friendly compressed format
- splitting oversized normalized audio into bounded chunks
- transcribing chunks with bounded parallelism
- merging the transcript into one ordered transcript
- running rubric scoring once on the merged transcript
- persisting the evaluation
- retrying retryable failures

### 5.3 Shared scoring core

The existing scorer in [`apps/web/lib/calls/ai-scoring.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/lib/calls/ai-scoring.ts) should be split into separable building blocks:

- `transcribeAudioAsset(...)`
- `scoreTranscript(...)`
- transcript normalization helpers
- rubric prompt builders

The worker will call these shared functions directly rather than duplicating scoring logic.

---

## 6. Data Model

### 6.1 Keep `calls` as the user-facing source of truth

The `calls` row remains the source of truth for:

- who owns the call
- current user-visible processing status
- final transcript
- final scores
- moments

The existing call status enum remains:

- `uploaded`
- `transcribing`
- `evaluating`
- `complete`
- `failed`

No new call status is required for this phase. Queue state lives in a new table.

### 6.2 Add `call_processing_jobs`

Add a new table in `packages/db/src/schema`:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `defaultRandom()` |
| `callId` | `uuid` FK → `calls.id` | `UNIQUE`, one active processing job per call |
| `sourceOrigin` | `text` enum(`manual_upload`,`zoom_recording`) | identifies ingestion path |
| `sourceStoragePath` | `text` | required Supabase Storage object path for the original asset |
| `sourceFileName` | `text` | required |
| `sourceContentType` | `text` | nullable |
| `sourceSizeBytes` | `integer` | nullable if source size is unknown during enqueue |
| `status` | `text` enum(`pending`,`running`,`retrying`,`failed`,`complete`) | job status |
| `attemptCount` | `integer` | starts at `0` |
| `maxAttempts` | `integer` | default `3` |
| `nextRunAt` | `timestamp with time zone` | default now; supports backoff |
| `lockedAt` | `timestamp with time zone` | nullable |
| `lockExpiresAt` | `timestamp with time zone` | nullable |
| `lastStage` | `text` enum(`download`,`normalize`,`chunk`,`transcribe`,`score`,`persist`) | nullable |
| `lastError` | `text` | nullable, human-readable failure detail |
| `createdAt` | `timestamp with time zone` | `defaultNow()` |
| `updatedAt` | `timestamp with time zone` | updated on every mutation |

Indexes:

- unique index on `callId`
- index on `(status, nextRunAt)`
- index on `lockExpiresAt`

### 6.3 Why store the original asset path in the job

The worker should always read from Supabase Storage, not from an expiring Zoom URL.

That means both ingestion paths must converge before enqueue:

- manual upload stores the original asset in the `call-recordings` bucket, then enqueues the job
- Zoom webhook downloads the preferred recording once, stores it in the same bucket, then enqueues the job

This makes worker retries independent from Zoom token expiry and independent from the original HTTP request lifecycle.

---

## 7. Ingestion Flows

### 7.1 Manual upload flow

1. Validate file type, consent, and app-level size guard
2. Create the `calls` row with `status = uploaded`
3. Store the original uploaded asset in Supabase Storage under a deterministic path such as `recordings/{callId}/source/{fileName}`
4. Create a `call_processing_jobs` row with `status = pending`
5. Return `{ id, status: "uploaded", createdAt }`

Important scope note:

- this phase keeps the current browser → web route upload shape
- it does **not** redesign upload transport into direct browser → storage uploads
- that means manual upload memory/performance can still be improved later, but the scoring and long-file processing path becomes correct immediately

### 7.2 Zoom webhook flow

1. Verify signature
2. Resolve the preferred recording, still preferring `audio_only` `m4a`
3. If a call already exists for the `zoomRecordingId` and its job is `pending`, `running`, or `complete`, return success without creating a duplicate
4. If the existing call previously failed, reuse that existing `callId`; otherwise create the `calls` row first with `status = uploaded`
5. Download the preferred recording once
6. Store the source asset in Supabase Storage under `recordings/{callId}/source/{fileName}`
7. Update the call with the stored `recordingUrl`
8. Create or reset the `call_processing_jobs` row with `status = pending`
9. Return success immediately

---

## 8. Worker Processing Pipeline

### 8.1 Polling and claiming

The worker runs a polling loop that:

- looks for jobs with `status IN ('pending','retrying')`
- filters to `nextRunAt <= now`
- ignores leased jobs where `lockExpiresAt > now`
- orders by `nextRunAt ASC, createdAt ASC`
- atomically claims one job at a time by setting:
  - `status = running`
  - `lockedAt = now`
  - `lockExpiresAt = now + 15 minutes`

Claiming must be atomic. The repository method should use one SQL statement or transaction so two workers cannot claim the same job.

### 8.2 Source fetch

The worker downloads the original asset from Supabase Storage into a temp workspace under `/tmp` for the duration of the job.

Safety guard:

- reject files larger than a configured `MAX_SOURCE_BYTES` before expensive processing
- default recommendation: `1 GB`

### 8.3 Audio normalization

Use `ffmpeg` in the worker to normalize every source asset into a speech-friendly audio format before deciding whether chunking is needed.

Recommended normalized output:

- format: `mp3`
- channels: `1` (mono)
- sample rate: `16000`
- bitrate: `32k`

Why this format:

- it strips useless video payload
- it dramatically reduces size for Zoom recordings
- it preserves enough fidelity for speech transcription
- it lets most 30-90 minute calls fit under the transcription size limit without chunking

Implementation requirement:

- resolve `FFMPEG_BINARY` from env first
- otherwise fall back to a packaged binary such as `ffmpeg-static`

### 8.4 Single-file vs chunked transcription

After normalization:

- if the normalized file is `<= 24 MB`, transcribe it as one file
- if the normalized file is `> 24 MB`, chunk it

The worker uses `24 MB` rather than `25 MB` to keep a safety margin for multipart overhead and metadata.

### 8.5 Whole-file transcription path

For normalized files within the safe limit:

- call OpenAI transcription once
- use the diarized model
- send `chunking_strategy: "auto"` for long audio
- preserve the returned segments for transcript lines

This is the preferred path because it preserves whole-call speaker consistency.

### 8.6 Chunked transcription path

If normalization is still not enough, split the normalized audio into sequential chunks sized to stay below `24 MB`.

Chunking rules:

- chunk after normalization, not before
- size chunks deterministically from output size and duration
- use bounded concurrency for transcription, default `3`
- merge transcripts in timestamp order after all chunk requests complete

Important quality note:

- speaker labels produced by per-chunk diarization are only reliable within each chunk
- the merged transcript must not claim cross-chunk speaker identity continuity as a hard guarantee
- scoring remains acceptable because the rubric scorer reasons over the merged conversation and inferred rep/buyer behavior, not over named speaker identity

### 8.7 Scoring

Once a merged transcript exists:

1. update the call to `transcribing` before transcription starts
2. update the call to `evaluating` immediately before rubric scoring
3. call the rubric scorer once on the merged transcript
4. persist the final evaluation and transcript in one transaction
5. mark both the job and the call complete

Scoring is always whole-call scoring. The system never scores individual chunks separately and averages them.

---

## 9. Retry and Failure Handling

### 9.1 Retryable failures

Retry with backoff for:

- transient storage download failures
- OpenAI `429`
- OpenAI `5xx`
- network timeouts
- temporary worker process interruptions

Backoff recommendation:

- attempt 1 retry after `2 minutes`
- attempt 2 retry after `10 minutes`
- attempt 3 retry after `30 minutes`

After `maxAttempts`, mark the job `failed` and the call `failed`.

### 9.2 Non-retryable failures

Fail immediately for:

- unsupported or undecodable media
- missing source asset after ingestion succeeded
- empty transcript after successful transcription
- malformed scoring payload that fails deterministic validation more than once in the same run

### 9.3 Idempotency

The pipeline must be safe to re-run for the same call.

Rules:

- `call_processing_jobs.callId` is unique
- resetting a failed call reuses the same `calls` row and the same job row
- `setCallEvaluation(...)` remains replace-safe by deleting and re-inserting call moments inside one transaction
- duplicate Zoom webhook deliveries must not create additional calls or jobs once one already exists for that recording

---

## 10. Testing

### 10.1 Database and repository tests

- create job
- claim next eligible job
- do not claim leased job
- reclaim expired lease
- schedule retry with backoff
- complete job
- fail job after max attempts

### 10.2 Web ingestion tests

Manual upload:

- stores source asset and enqueues a job
- returns without calling the scorer inline
- marks the call `uploaded`

Zoom webhook:

- stores source asset and enqueues a job
- ignores duplicate completed/pending jobs
- resets failed jobs instead of creating duplicates

### 10.3 Worker pipeline tests

- normalizes video to audio
- bypasses chunking when normalized output is under the safe limit
- chunks oversized normalized audio
- transcribes chunked audio with bounded concurrency
- merges ordered transcript lines correctly
- runs scoring once on the merged transcript
- persists complete evaluation and marks the call complete
- records retryable and terminal failures correctly

### 10.4 Integration tests

End-to-end worker tests should stub:

- storage download/upload
- ffmpeg adapter
- OpenAI transcription
- OpenAI scoring

The goal is to prove the pipeline behavior deterministically without requiring real media binaries or real model calls in CI.

---

## 11. File Boundaries

Recommended file layout:

- `packages/db/src/schema/call-processing-jobs.ts` — new job table
- `apps/web/lib/calls/processing-repository.ts` — shared job repository contract
- `apps/web/lib/calls/ingestion-service.ts` — enqueue logic shared by manual upload and Zoom
- `apps/web/lib/integrations/zoom-webhook.ts` — reduced to ingest/store/enqueue only
- `apps/worker/src/jobs/poll-call-processing-jobs.ts` — polling loop
- `apps/worker/src/jobs/process-call-job.ts` — one job execution path
- `apps/worker/src/media/normalize-audio.ts` — ffmpeg adapter
- `apps/worker/src/media/chunk-audio.ts` — chunking helper
- `apps/web/lib/calls/ai-scoring.ts` — refactored shared transcription/scoring primitives

The key boundary is simple:

- ingestion code never transcribes
- worker code never decides who is allowed to upload or own a call

---

## 12. Operational Notes

- The worker must expose a health endpoint and structured logs for job stage, call ID, and attempt count
- The worker should process one job per loop iteration initially; horizontal scaling can come later
- Notifications should be created only after successful evaluation persistence, not on enqueue
- Transcript chunk artifacts should remain ephemeral temp files and should not be persisted in storage in this phase

---

## 13. Implementation Recommendation

Implement this in one vertical slice:

1. schema + repository methods for jobs
2. ingestion handoff in manual upload and Zoom webhook
3. worker poll/claim loop
4. normalization + whole-file safe transcription path
5. chunked fallback path
6. final scoring + persistence
7. retry tests and regression tests

That order gets the system production-safe quickly while keeping the most complex media logic contained in the worker.
