# Buyer Personality From Recordings Implementation Plan

> **For agentic workers:** Execute this plan with the repository's `executing-plans` or `subagent-driven-development` workflow. Use test-driven development for every production-code task, run the scoped verification after each task, and do not deploy or enable production capabilities without separate authorization.

**Goal:** Let beta users upload an accepted audio or video recording, transcribe its audio, derive an anonymized buyer-personality profile, and generate a live roleplay that behaves like the buyer even when call scoring is disabled.

**Architecture:** Keep the existing direct browser-to-Supabase upload and worker FFmpeg normalization paths. Separate transcription, buyer-personality extraction, and call scoring into independent processing branches. Persist a reusable profile on the source call and an immutable snapshot on each generated roleplay session. Feed that snapshot into live Realtime instructions. Preserve the existing scoring branch for workspaces that have `call_scoring`, but do not require it for recording-derived roleplays.

**Tech stack:** Next.js App Router, React, TypeScript, Vitest, Drizzle/Postgres, Supabase Storage and Data API, Fly worker, FFmpeg, OpenAI transcription, OpenAI Responses API Structured Outputs, OpenAI Realtime

---

## Confirmed Product Decisions

- The upload UI title is **Upload Recording / Audio**.
- The UI lists accepted files: **MP3, WAV, M4A, MP4, and WebM**.
- Video remains accepted. The worker extracts and processes its audio track; users do not have to convert video before uploading.
- Keep the current `500 MB` per-file beta limit. Compressed one-to-two-hour audio should fit comfortably; large video continues to work when it fits that limit.
- Assume `call_scoring` is disabled for the beta workspace.
- The beta path is: upload recording -> normalize audio -> diarized transcript -> buyer-personality profile -> generated roleplay.
- Buyer personality means behavioral simulation, not voice cloning or identity imitation. Continue using Argos's synthetic buyer voice choices.
- Preserve a separately capability-gated scoring path for other workspaces; do not delete scoring code.

## Current Gaps This Plan Closes

1. `apps/worker/src/jobs/process-call-job.ts` currently fails the job before download when `call_scoring` is disabled.
2. The worker persists transcript only as part of `setCallEvaluation`, so there is no transcription-only completion path.
3. `apps/web/app/api/calls/[id]/generate-roleplay/route.ts` requires `call_scoring` even though generated roleplay should depend on recording access plus roleplay capabilities.
4. `apps/web/lib/roleplay/generate-from-call.ts` derives a generic scenario from scores and coaching moments; it does not use the buyer's transcript.
5. `apps/web/lib/roleplay/openai-voice.ts` does not include `scenarioSummary`, `scenarioBrief`, or a buyer-personality profile in live Realtime instructions.
6. `/calls` and `/calls/[id]` are page-gated by `call_scoring`, so a beta user with upload and roleplay access cannot reach the uploaded recording after completion.
7. Upload progress and empty-state copy promises analysis and a scorecard even when scoring is disabled.

## Target Flow

```text
MP3 / WAV / M4A / MP4 / WebM
            |
            v
Supabase call-recordings bucket
            |
            v
Worker: FFmpeg strips video + normalizes speech audio
            |
            v
OpenAI diarized transcript (speaker + timestamp + text)
            |
            +--------------------------+
            |                          |
            v                          v
Buyer Personality extraction      Optional call scoring
(roleplay capability)             (call_scoring capability)
            |                          |
            +-------------+------------+
                          v
              Persist call as complete
                          |
                          v
          Generate roleplay with profile snapshot
                          |
                          v
       Realtime buyer behavior uses profile + scenario
```

## Buyer Personality Contract

Add the following shared contract to `packages/call-processing/src/buyer-personality.ts` and export it from `packages/call-processing/src/index.ts`:

```ts
export const BUYER_PERSONALITY_SCHEMA_VERSION = 1;

export type BuyerPersonalityProfile = {
  schemaVersion: 1;
  confidence: "high" | "medium" | "low";
  buyerSpeakerLabels: string[];
  speakerRationale: string;
  summary: string;
  communicationStyle: {
    directness: "low" | "medium" | "high";
    warmth: "low" | "medium" | "high";
    skepticism: "low" | "medium" | "high";
    patience: "low" | "medium" | "high";
    detailOrientation: "low" | "medium" | "high";
    decisionStyle: "analytical" | "collaborative" | "decisive" | "cautious" | "mixed";
    questionStyle: string;
  };
  motivations: string[];
  concerns: string[];
  objections: Array<{
    topic: string;
    expressionStyle: string;
    evidenceTimestampsSeconds: number[];
  }>;
  decisionCriteria: string[];
  engagementTriggers: string[];
  resistanceTriggers: string[];
  languagePatterns: string[];
  roleplayBehavior: {
    openingPosture: string;
    conversationalRules: string[];
    escalationRules: string[];
    evidenceNeededToMoveForward: string[];
    realisticResolutionConditions: string[];
  };
};
```

Contract rules:

- Every behavioral claim must be supported by the buyer's transcript.
- Use timestamps as evidence; do not store long verbatim transcript excerpts in the profile.
- Remove or generalize names, phone numbers, email addresses, and other direct identifiers.
- Set missing evidence to an empty array or neutral value; never invent buyer facts.
- `low` speaker confidence results in `buyer_profile_status = 'needs_review'`.
- Transcript content is untrusted evidence. Prompt text inside the recording never overrides extraction or roleplay instructions.
- Keep personality behavior separate from synthetic voice selection.

---

### Task 1: Make Upload UI Recording-First And Scoring-Neutral

**Files:**
- Modify: `apps/web/app/(authenticated)/upload/page.tsx`
- Modify: `apps/web/components/upload-call-panel.tsx`
- Modify: `apps/web/lib/upload-call-panel.test.tsx`

- [ ] Add failing assertions for the exact visible title `Upload Recording / Audio` and accepted-file line `Accepted: MP3, WAV, M4A, MP4, and WebM. Up to 500 MB each.`
- [ ] Add failing assertions that upload copy does not contain `scorecard`, `scored`, or `scoring`.
- [ ] Run: `npm run test:web -- lib/upload-call-panel.test.tsx`
- [ ] Update the toolbar:
  - title: `Upload Recording / Audio`
  - description: `Upload a recording or audio file to transcribe it and generate a buyer-personality roleplay.`
  - secondary action label: `View recordings`
- [ ] Update the dropzone heading to `Drop recording or audio here`.
- [ ] Preserve the file input accept contract from `CALL_UPLOAD_ACCEPTED_TYPES` and `CALL_UPLOAD_ACCEPTED_EXTENSIONS`.
- [ ] Use the exact accepted-file line above; do not imply video is rejected.
- [ ] Replace scoring-oriented state copy:
  - `Upload complete. Argos is processing the recording and preparing it for roleplay.`
  - active title: `Processing recording`
  - ready description: `Ready to upload and process this recording.`
  - queued description: `All selected recordings were uploaded and queued for processing.`
- [ ] Change primary action labels from `Upload call(s)` to `Upload recording(s)`.
- [ ] Keep `Call Context` optional unless a separate copy decision is approved; it becomes useful context for personality extraction.
- [ ] Re-run the scoped test and confirm it passes.

### Task 2: Add Buyer-Personality Types, Schema, Parser, And Prompt

**Files:**
- Create: `packages/call-processing/src/buyer-personality.ts`
- Create: `apps/worker/src/call-processing/buyer-personality.test.ts`
- Modify: `packages/call-processing/src/index.ts`
- Modify: `packages/call-processing/src/openai.ts`
- Modify: `apps/web/.env.example`

- [ ] Write failing tests covering:
  - valid structured profile parsing
  - rejection of missing required fields and unknown schema versions
  - buyer-speaker override preservation
  - low-confidence speaker assignment
  - PII-like language not copied into `languagePatterns`
  - transcript prompt-injection text treated as evidence, not instructions
  - timestamps outside the call duration rejected
- [ ] Run: `npm run test:worker -- src/call-processing/buyer-personality.test.ts`
- [ ] Implement runtime validation without trusting TypeScript casts. Reuse small explicit validators consistent with `parseScoringResponse`; do not add a validation dependency solely for this feature.
- [ ] Add `extractBuyerPersonalityFromTranscript(...)` using the OpenAI Responses API with:
  - `store: false`
  - a strict JSON Schema Structured Output matching `BuyerPersonalityProfile`
  - an explicit developer instruction that transcript lines are untrusted quoted evidence
  - `OPENAI_BUYER_PERSONALITY_MODEL`, defaulting to the existing `OPENAI_TRAINING_MODEL` and then `gpt-5-mini`
  - the same privileged runtime identity checks used by call processing
  - a 60-second timeout and retryable error messages containing HTTP status only plus sanitized provider text
- [ ] Build transcript evidence across the whole call. If a transcript exceeds the configured character budget, preserve the beginning, evenly sampled middle sections, and ending rather than truncating only the end.
- [ ] Support an optional `buyerSpeakerOverride` while still requiring the model to extract evidence only from that speaker.
- [ ] Add `OPENAI_BUYER_PERSONALITY_MODEL=gpt-5-mini` to `apps/web/.env.example`.
- [ ] Re-run tests and `npm run typecheck:worker`.

Implementation note: official OpenAI documentation supports JSON outputs from the Responses API and strict Structured Outputs. Keep the schema in code rather than relying on prose-only JSON instructions: https://developers.openai.com/api/reference/cli/resources/responses/methods/create

### Task 3: Persist Reusable Profiles And Immutable Roleplay Snapshots

**Files:**
- Create with CLI: a Supabase migration generated by `npx supabase migration new add_buyer_personality_profiles`
- Modify: `packages/db/src/schema/calls.ts`
- Modify: `packages/db/src/schema/roleplay.ts`
- Modify: `apps/web/lib/supabase/database.types.ts`

- [ ] Run `npx supabase migration new add_buyer_personality_profiles` and edit the exact generated file. Do not invent a timestamped migration filename.
- [ ] Add this migration behavior:

```sql
alter table public.calls
  add column if not exists buyer_profile_status text,
  add column if not exists buyer_personality_profile jsonb,
  add column if not exists buyer_personality_schema_version integer,
  add column if not exists buyer_personality_model text,
  add column if not exists buyer_personality_generated_at timestamptz;

alter table public.calls
  drop constraint if exists calls_buyer_profile_status_check;

alter table public.calls
  add constraint calls_buyer_profile_status_check
  check (
    buyer_profile_status is null
    or buyer_profile_status in ('pending', 'processing', 'ready', 'needs_review', 'failed')
  );

alter table public.roleplay_sessions
  add column if not exists buyer_personality_snapshot jsonb;

alter table public.call_processing_jobs
  drop constraint if exists call_processing_jobs_last_stage_check;

alter table public.call_processing_jobs
  add constraint call_processing_jobs_last_stage_check
  check (last_stage in ('download', 'normalize', 'chunk', 'transcribe', 'profile', 'score', 'persist'));

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('call_scored', 'recording_ready', 'annotation_added', 'module_assigned'));
```

- [ ] Update Drizzle schema enums and JSON types for the new columns.
- [ ] Update the generated Supabase TypeScript types to include the new columns.
- [ ] Do not add a new public table. Existing `calls` and `roleplay_sessions` RLS policies continue to scope rows by organization; verify that the added columns do not alter those policies.
- [ ] Run: `npm run typecheck:db`
- [ ] Run: `supabase db reset` when the local Supabase stack is available; expected result is all migrations applying without a constraint or RLS error.
- [ ] Run the Supabase security advisor after applying the migration to a linked non-production environment. Do not apply directly to production during plan execution.

Supabase note: new public tables now require explicit Data API grants separately from RLS. This design deliberately adds columns to already-exposed, already-RLS-protected tables: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

### Task 4: Add Transcription-And-Profile Persistence Without Scores

**Files:**
- Modify: `apps/worker/src/calls/repository.ts`
- Modify: `apps/worker/src/calls/repository.test.ts`
- Modify: `packages/db/src/managed-capabilities.ts`

- [ ] Write failing repository tests for a call whose workspace has `call_upload`, `roleplay`, and `custom_scenarios` but not `call_scoring`.
- [ ] Add `getCallProcessingCapabilities(callId)` returning:

```ts
{
  canGenerateBuyerPersonality: boolean;
  canScoreCall: boolean;
}
```

- [ ] Define `canGenerateBuyerPersonality` as active `roleplay` plus active `custom_scenarios`, with either `call_upload` or `call_ingestion`.
- [ ] Add a transaction method `persistProcessedCall(...)` accepting transcription, optional buyer profile, optional evaluation, and profile metadata.
- [ ] When evaluation is absent:
  - persist `duration_seconds` and `transcript`
  - persist profile fields
  - set call `status = 'complete'`
  - leave all score, rubric, strengths, improvements, drills, score rows, and moment rows null or unchanged only when no new scoring run occurred
- [ ] When evaluation is present, preserve existing score and moment replacement behavior while also persisting the transcript/profile once.
- [ ] Add `recording_ready` to repository notification types.
- [ ] Run: `npm run test:worker -- src/calls/repository.test.ts`
- [ ] Run: `npm run typecheck:worker`

### Task 5: Branch Worker Processing By Capability

**Files:**
- Modify: `apps/worker/src/jobs/process-call-job.ts`
- Modify: `apps/worker/src/jobs/process-call-job.test.ts`
- Modify: `packages/db/src/schema/callProcessingJobs.ts`

- [ ] Replace the current `call_scoring capability disabled` early failure test with three failing tests:
  1. personality-only workspace transcribes, profiles, persists, and completes without calling the scorer
  2. scoring-only workspace preserves the existing scoring path
  3. workspace with neither supported path fails closed before download
- [ ] Add a fourth test proving an MP4 source is normalized before transcription and the profile extractor receives transcript lines, not video bytes.
- [ ] Extend `JobStage` and `CALL_PROCESSING_JOB_STAGES` with `profile`.
- [ ] At job start, load both processing capabilities. Proceed when either branch is allowed.
- [ ] Always download, normalize, and transcribe once.
- [ ] If `canGenerateBuyerPersonality`, set `buyer_profile_status = 'processing'`, run `extractBuyerPersonalityFromTranscript`, and classify:
  - confidence high/medium -> `ready`
  - confidence low -> `needs_review`
- [ ] If `canScoreCall`, run the existing rubric scoring branch independently.
- [ ] Persist all available outputs in one repository transaction and complete the job.
- [ ] Emit `recording_ready` with link `/calls/{callId}` when scoring is disabled; retain `call_scored` only when scoring ran.
- [ ] Preserve retry classification for 429, 5xx, timeout, connection reset, and temporary provider errors.
- [ ] Re-run: `npm run test:worker -- src/jobs/process-call-job.test.ts`
- [ ] Run: `npm run verify:worker`

### Task 6: Make Recording Pages Accessible Without Call Scoring

**Files:**
- Modify: `apps/web/lib/access/managed-capabilities-server.ts`
- Modify: `apps/web/lib/access/managed-capabilities.test.ts`
- Modify: `apps/web/app/(authenticated)/calls/page.tsx`
- Modify: `apps/web/app/(authenticated)/calls/[id]/page.tsx`
- Modify: `apps/web/components/call-detail-panel.tsx`
- Modify relevant tests discovered by `rg -l 'Find and review scored calls|scorecard|call_scoring' apps/web/lib --glob '*test*'`

- [ ] Add `requireAnyAuthenticatedManagedCapability(...)` for API use and reuse the existing page helper for page gates.
- [ ] Change recording library/detail page gates to allow `call_upload`, `call_ingestion`, or `call_scoring`; row-level repository scoping remains authoritative for the specific call.
- [ ] Compute `scoringEnabled` from effective capabilities.
- [ ] When scoring is disabled:
  - title the collection `Recordings`
  - hide score filters, score columns, coaching moments, scorecard, and scoring empty states
  - show filename/topic, owner, upload date, processing state, transcript readiness, buyer-profile state, and `Generate roleplay`
  - use `Processing recording` for `uploaded` or `transcribing`
- [ ] When scoring is enabled, preserve the current scored-call UI.
- [ ] Add tests for both capability modes so future work cannot accidentally reintroduce a scoring dependency.
- [ ] Run scoped tests, then `npm run typecheck:web`.

### Task 7: Show And Correct The Detected Buyer Profile

**Files:**
- Create: `apps/web/components/buyer-personality-panel.tsx`
- Create: `apps/web/lib/buyer-personality-panel.test.tsx`
- Create: `apps/web/app/api/calls/[id]/buyer-personality/route.ts`
- Create: `apps/web/lib/buyer-personality-route.test.ts`
- Modify: `apps/web/lib/calls/service.ts`
- Modify: `apps/web/lib/calls/repository.ts`
- Modify: `apps/web/lib/calls/supabase-repository.ts`
- Modify: `apps/web/app/(authenticated)/calls/[id]/page.tsx`
- Modify: `apps/web/lib/rate-limit/service.ts`

- [ ] Extend `CallDetail` and both repository implementations with profile status, validated profile, model, schema version, and generation time.
- [ ] Render only concise profile fields: summary, communication style, motivations, concerns, objections, and confidence.
- [ ] Do not expose raw extraction prompts, provider responses, or PII.
- [ ] For `needs_review`, show diarized speaker labels with two short, escaped transcript samples per speaker and ask the user to select the buyer speaker.
- [ ] Add authenticated POST `{ buyerSpeakerLabel: string }` regeneration:
  - require `roleplay` and `custom_scenarios`
  - require either `call_upload` or `call_ingestion`
  - load the organization-scoped call transcript
  - reject labels absent from the transcript
  - rate-limit by user
  - call the shared extractor with `buyerSpeakerOverride`
  - persist the replacement profile and metadata
- [ ] Return `409` when transcription is incomplete and `422` when the selected speaker lacks enough evidence.
- [ ] Add tests for cross-tenant denial, invalid speaker labels, low-confidence review, and successful regeneration.
- [ ] Run scoped tests and `npm run typecheck:web`.

### Task 8: Generate Roleplays From The Buyer Profile, Not Call Scores

**Files:**
- Modify: `apps/web/app/api/calls/[id]/generate-roleplay/route.ts`
- Modify: `apps/web/lib/generate-roleplay-route.test.ts`
- Modify: `apps/web/lib/roleplay/generate-from-call.ts`
- Modify: `apps/web/lib/roleplay/generate-from-call.test.ts`
- Modify: `apps/web/lib/roleplay/types.ts`
- Modify: `apps/web/lib/roleplay/repository.ts`
- Modify: `apps/web/lib/roleplay/supabase-repository.ts`
- Modify: `apps/web/lib/roleplay/service.ts`

- [ ] Remove the `call_scoring` requirement from the generated-roleplay route.
- [ ] Require `roleplay`, `custom_scenarios`, and either `call_upload` or `call_ingestion`.
- [ ] Require call `status = 'complete'` and `buyer_profile_status = 'ready'`; return an actionable `409 buyer_profile_not_ready` otherwise.
- [ ] Replace score/moment-based `GeneratedRoleplayPreviewCall` with a profile-based input containing source call ID, topic, and validated buyer profile.
- [ ] Build scenario summary, brief, opener, resistance level, and resolution conditions from the profile.
- [ ] Keep active rubric focus options available for roleplay practice when configured, but do not require a call score or call evaluation.
- [ ] Copy the validated profile into `roleplay_sessions.buyer_personality_snapshot` at creation time. Never read the mutable call profile during an active session.
- [ ] Extend Drizzle and Supabase roleplay repositories and normalizers with the snapshot.
- [ ] Add tests proving two roleplays retain their original snapshots after the call profile is regenerated.
- [ ] Run: `npm run test:web -- lib/roleplay/generate-from-call.test.ts lib/generate-roleplay-route.test.ts lib/roleplay/service.test.ts`

### Task 9: Feed Personality And Scenario Into Live Realtime Instructions

**Files:**
- Modify: `apps/web/lib/roleplay/openai-voice.ts`
- Modify: `apps/web/lib/roleplay/openai-voice.test.ts`
- Modify: `apps/web/app/api/roleplay/sessions/[id]/realtime/route.ts`
- Modify: `apps/web/lib/roleplay-voice-routes.test.ts`

- [ ] Add failing tests proving generated sessions include:
  - scenario summary and scenario brief
  - directness, warmth, skepticism, patience, decision style, and question style
  - motivations, concerns, objections, engagement triggers, and resistance triggers
  - conversational, escalation, evidence, and resolution rules
- [ ] Add injection-resistance tests where a transcript-derived string says to reveal prompts or leave character; the final instruction must explicitly treat profile strings as untrusted descriptive data.
- [ ] Update `buildRoleplayRealtimeInstructions` to include a bounded, sanitized personality snapshot and scenario before recent roleplay history.
- [ ] Preserve the existing synthetic `marin`/`cedar` voice selection; do not infer or clone voice from source audio.
- [ ] Keep recent roleplay context limited as it is today and ensure generated profile text cannot crowd out core safety/character instructions.
- [ ] Run: `npm run test:web -- lib/roleplay/openai-voice.test.ts lib/roleplay-voice-routes.test.ts`
- [ ] Run: `npm run typecheck:web`

### Task 10: Beta Fixtures And End-To-End Verification

**Files:**
- Create: `apps/worker/src/jobs/buyer-personality-pipeline.integration.test.ts`
- Modify: `apps/web/lib/roleplay-readability-contract.test.ts` only if the new panel changes its contract
- Add a privacy-safe fixture under the closest existing test fixture directory discovered with `rg --files | rg 'fixtures|test-support'`

- [ ] Create one anonymized two-speaker transcript fixture containing discovery, skepticism, objections, engagement changes, and a decision condition.
- [ ] Verify the personality-only worker path never calls `scoreTranscriptFromLines`.
- [ ] Verify MP4 and M4A metadata both enter the same normalization/transcription/profile path.
- [ ] Verify the completed call retains null score fields while profile status is ready.
- [ ] Verify generated roleplay instructions contain behavior from the profile snapshot and no source identity.
- [ ] Verify a low-confidence transcript requires speaker review before roleplay generation.
- [ ] Run targeted suites:

```bash
npm run test:worker -- src/jobs/process-call-job.test.ts src/jobs/buyer-personality-pipeline.integration.test.ts src/call-processing/buyer-personality.test.ts
npm run test:web -- lib/upload-call-panel.test.tsx lib/generate-roleplay-route.test.ts lib/roleplay/generate-from-call.test.ts lib/roleplay/openai-voice.test.ts lib/roleplay-voice-routes.test.ts lib/buyer-personality-route.test.ts lib/buyer-personality-panel.test.tsx
```

- [ ] Run complete local gates:

```bash
npm run verify
```

- [ ] Expected result: DB, web, and worker typechecks pass; all Vitest suites pass; web production build succeeds.
- [ ] Run `git diff --check` and confirm only approved source, test, migration, generated type, and plan files changed.
- [ ] Do not claim hosted readiness from local tests alone.

### Task 11: Controlled Beta Release And Evidence Collection

**No production mutation is authorized by this plan alone.** Deployment, capability changes, and live-recording tests require separate user authorization.

- [ ] Deploy migration to a non-production Supabase environment first.
- [ ] Run Supabase security and performance advisors; resolve new findings before production.
- [ ] Deploy worker and web from the same verified commit.
- [ ] Confirm hosted worker environment has `OPENAI_BUYER_PERSONALITY_MODEL` and the intended OpenAI project identity without printing secrets.
- [ ] Grant the beta workspace only the required capabilities:
  - `call_upload`
  - `roleplay`
  - `roleplay_voice`
  - `custom_scenarios`
  - optional `practice_reporting`
  - explicitly omit `call_scoring`
- [ ] Upload one consented M4A and one consented MP4 through the hosted UI.
- [ ] Read back persisted call status, transcript, buyer profile, source content type, and roleplay snapshot from the destination system.
- [ ] Start a generated voice roleplay and verify the buyer exhibits at least three evidence-backed profile behaviors.
- [ ] Verify the UI shows no scorecard, score filter, or scoring promise for the beta workspace.
- [ ] Record failures separately for upload, transcription, speaker mapping, profile extraction, roleplay creation, and live behavior. Do not collapse these into one “worked/failed” result.

---

## Acceptance Criteria

- A beta user can upload MP3, WAV, M4A, MP4, or WebM up to 500 MB.
- The upload UI says `Upload Recording / Audio` and lists accepted formats.
- An MP4 is normalized to audio by the worker; video bytes are never sent to transcription or personality extraction.
- A workspace without `call_scoring` completes recording processing rather than failing closed.
- The completed call contains a diarized transcript and validated buyer-personality profile while all call score fields remain null.
- Low-confidence buyer-speaker detection is visible and correctable.
- Generated roleplay creation does not require call scoring, scores, call moments, or a scorecard.
- Each generated roleplay stores an immutable buyer-personality snapshot.
- Live Realtime instructions include scenario and personality behavior while treating profile strings as untrusted data.
- No voice cloning or buyer identity imitation is introduced.
- Cross-tenant access remains denied by repository scope and existing RLS.
- Full local verification passes, and hosted behavior is reported only after independent readback and a controlled live test.

## Explicit Non-Goals

- Raising the upload limit to 1 GB or 2 GB
- Browser-side video conversion
- Video analysis, facial analysis, or screen-content analysis
- Voice cloning or biometric identity matching
- Enabling call scoring for the beta workspace
- Public production rollout
- Automatically treating an inferred buyer profile as high confidence without transcript evidence
