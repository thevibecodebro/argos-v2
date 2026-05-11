# Argos Remaining Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the local gaps left after the remediation sweep: true voice usage settlement, retention/export/audit surfaces, remaining UI polish/browser QA, and live provider verification.

**Architecture:** Keep the current `codex/argos-remediation-sweep` branch and add small, separately committed slices. Use service-level tests first, keep provider verification as evidence-producing commands, and do not touch the untracked audit docs unless explicitly requested.

**Tech Stack:** Next.js App Router, React, Drizzle/Postgres, Supabase Auth/Storage, Stripe webhooks/Checkout, OpenAI realtime/TTS, Vercel deployment tooling, Vitest, Playwright/browser-use.

---

## Current Branch State

- Branch: `codex/argos-remediation-sweep`
- Keep untouched:
  - `docs/audits/codebase-risk-audit-2026-05-10.md`
  - `docs/audits/ux-ui-audit-2026-05-10.md`
- Already verified: `npm run verify` passes on the branch.
- Known unresolved audit finding: `npm audit --omit=dev --audit-level=moderate` reports Next's nested `postcss <8.5.10`; npm's suggested fix downgrades to `next@9.3.3`, which is not acceptable.

## File Structure

- Voice settlement:
  - Modify `packages/db/src/schema/roleplay.ts` to persist voice start/end/settlement metadata.
  - Add migration `supabase/migrations/202605110002_roleplay_voice_settlement.sql`.
  - Modify `apps/web/lib/roleplay/service.ts`, `apps/web/lib/roleplay/repository.ts`, and `apps/web/lib/roleplay/supabase-repository.ts`.
  - Modify `apps/web/app/api/roleplay/sessions/[id]/realtime/route.ts` and `apps/web/app/api/roleplay/sessions/[id]/complete/route.ts`.
  - Test in `apps/web/lib/roleplay/service.test.ts` and `apps/web/lib/roleplay-voice-routes.test.ts`.

- Retention/export/audit:
  - Add schema `packages/db/src/schema/auditEvents.ts` and export it from `packages/db/src/schema/index.ts`.
  - Add migration `supabase/migrations/202605110003_audit_events_and_call_export.sql`.
  - Extend `apps/web/lib/calls/service.ts`, `repository.ts`, and `supabase-repository.ts`.
  - Add routes `apps/web/app/api/calls/[id]/export/route.ts` and extend `apps/web/app/api/calls/[id]/route.ts`.
  - Test in `apps/web/lib/calls/service.test.ts`, `apps/web/lib/call-export-route.test.ts`, and `apps/web/lib/call-delete-route.test.ts`.

- UI polish/browser QA:
  - Modify `apps/web/components/call-detail-panel.tsx`.
  - Modify `apps/web/components/settings/people-panel.tsx`.
  - Modify `apps/web/app/(authenticated)/notifications/page.tsx` or its panel component if present.
  - Modify mobile table/list surfaces in `apps/web/app/(authenticated)/calls/page.tsx` and `apps/web/app/(authenticated)/highlights/page.tsx`.
  - Add or extend static/render tests near existing `*-panel.test.tsx` files.

- Production verification:
  - Use Vercel CLI/API for env and deployment evidence.
  - Use Supabase CLI/MCP/API for hosted Auth and storage/schema evidence.
  - Use Stripe CLI/API for webhook/checkout evidence.
  - Use Vercel logs for live smoke evidence.
  - Do not hard-code secrets in repo.

---

### Task 1: Persist And Settle Roleplay Voice Usage

**Files:**
- Modify: `packages/db/src/schema/roleplay.ts`
- Create: `supabase/migrations/202605110002_roleplay_voice_settlement.sql`
- Modify: `apps/web/lib/roleplay/service.ts`
- Modify: `apps/web/lib/roleplay/repository.ts`
- Modify: `apps/web/lib/roleplay/supabase-repository.ts`
- Modify: `apps/web/app/api/roleplay/sessions/[id]/realtime/route.ts`
- Modify: `apps/web/app/api/roleplay/sessions/[id]/complete/route.ts`
- Test: `apps/web/lib/roleplay/service.test.ts`
- Test: `apps/web/lib/roleplay-voice-routes.test.ts`

- [x] **Step 1: Write failing service tests**

Add tests proving:

```ts
it("records voice session start without debiting minutes immediately", async () => {
  // create realtime session
  // expect repository.markVoiceStarted(sessionId, startedAt)
  // expect consumeVoiceMinutes not called before session completion
});

it("debits elapsed realtime minutes once when the roleplay is completed", async () => {
  // startedAt = 2026-05-11T20:00:00.000Z
  // completedAt = 2026-05-11T20:08:10.000Z
  // expected debit = 9 minutes
  // expected idempotencyKey = roleplay:session-1:complete
});
```

- [x] **Step 2: Run tests and verify red**

Run:

```bash
npm run test -w @argos-v2/web -- lib/roleplay/service.test.ts lib/roleplay-voice-routes.test.ts
```

Expected: fail because roleplay sessions do not persist voice start/end/settlement metadata and realtime route still debits immediately.

- [x] **Step 3: Add DB fields and migration**

Add nullable columns to `roleplay_sessions`:

```sql
alter table roleplay_sessions
  add column if not exists voice_started_at timestamptz,
  add column if not exists voice_completed_at timestamptz,
  add column if not exists voice_minutes_settled integer not null default 0,
  add column if not exists voice_settled_at timestamptz;
```

- [x] **Step 4: Implement minimal service behavior**

Add repository methods:

```ts
markVoiceStarted(sessionId: string, startedAt: Date): Promise<RoleplaySessionRecord>;
settleVoiceUsage(sessionId: string, input: {
  completedAt: Date;
  minutesSettled: number;
}): Promise<RoleplaySessionRecord>;
```

Realtime route only marks start after OpenAI returns success. Complete route calculates minutes from `voiceStartedAt` to completion and calls `consumeVoiceMinutes` once with `idempotencyKey: roleplay:${id}:complete`.

- [x] **Step 5: Verify green**

Run:

```bash
npm run test -w @argos-v2/web -- lib/roleplay/service.test.ts lib/roleplay-voice-routes.test.ts
npm run typecheck:db
npm run typecheck:web
```

- [x] **Step 6: Commit**

```bash
git add packages/db/src/schema/roleplay.ts supabase/migrations/202605110002_roleplay_voice_settlement.sql apps/web/lib/roleplay apps/web/app/api/roleplay
git commit -m "Settle roleplay voice usage on completion"
```

### Task 2: Add Call Export And Audit Events

**Files:**
- Create: `packages/db/src/schema/auditEvents.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `supabase/migrations/202605110003_audit_events_and_call_export.sql`
- Modify: `apps/web/lib/calls/service.ts`
- Modify: `apps/web/lib/calls/repository.ts`
- Modify: `apps/web/lib/calls/supabase-repository.ts`
- Create: `apps/web/app/api/calls/[id]/export/route.ts`
- Test: `apps/web/lib/calls/service.test.ts`
- Test: `apps/web/lib/call-export-route.test.ts`

- [x] **Step 1: Write failing tests**

Add tests proving:

```ts
it("exports call transcript, scorecard, moments, annotations, and metadata for admins", async () => {
  // expect export payload includes call.id, transcript, moments, annotations, scores, recording metadata
  // expect audit event "call_exported"
});

it("blocks reps from exporting another rep's call", async () => {
  // expect 403 and no audit event
});
```

- [x] **Step 2: Run tests and verify red**

Run:

```bash
npm run test -w @argos-v2/web -- lib/calls/service.test.ts lib/call-export-route.test.ts
```

Expected: fail because no export service/route/audit event exists.

- [x] **Step 3: Add audit event schema**

Create `audit_events` with:

```ts
id uuid primary key defaultRandom()
orgId uuid not null references organizations(id) on delete cascade
actorUserId uuid references users(id) on delete set null
eventType text not null
entityType text not null
entityId text not null
metadata jsonb
createdAt timestamptz not null default now()
```

Migration must enable RLS and revoke direct anon/auth access.

- [x] **Step 4: Implement export service and route**

Add `exportCallData(repository, authUserId, callId)` returning JSON-safe data and inserting an audit event:

```ts
{
  exportedAt: string;
  call: CallDetail;
  annotations: CallAnnotation[];
  recording: CallRecordingReference | null;
}
```

Route `GET /api/calls/[id]/export` returns JSON with `Cache-Control: private, no-store` and `Content-Disposition: attachment; filename="argos-call-<id>.json"`.

- [x] **Step 5: Verify green**

Run:

```bash
npm run test -w @argos-v2/web -- lib/calls/service.test.ts lib/call-export-route.test.ts
npm run typecheck:db
npm run typecheck:web
```

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/auditEvents.ts packages/db/src/schema/index.ts supabase/migrations/202605110003_audit_events_and_call_export.sql apps/web/lib/calls apps/web/app/api/calls
git commit -m "Add audited call export"
```

### Task 3: Audit Call Deletion Lifecycle

**Files:**
- Modify: `apps/web/lib/calls/service.ts`
- Modify: `apps/web/lib/calls/repository.ts`
- Modify: `apps/web/lib/calls/supabase-repository.ts`
- Test: `apps/web/lib/calls/service.test.ts`
- Test: `apps/web/lib/call-delete-route.test.ts`

- [x] **Step 1: Write failing tests**

Add tests proving call deletion inserts an audit event before deletion:

```ts
it("audits admin call data deletion before removing the call", async () => {
  // expect insertAuditEvent called with eventType "call_deleted"
  // expect metadata includes deletedStorageObjects and callId
});
```

- [x] **Step 2: Run tests and verify red**

Run:

```bash
npm run test -w @argos-v2/web -- lib/calls/service.test.ts lib/call-delete-route.test.ts
```

- [x] **Step 3: Implement audit insertion**

Extend repository interface:

```ts
insertAuditEvent(input: {
  orgId: string;
  actorUserId: string;
  eventType: "call_deleted" | "call_exported";
  entityType: "call";
  entityId: string;
  metadata: Record<string, unknown>;
}): Promise<void>;
```

Call it before `deleteCall(callId)`.

- [x] **Step 4: Verify green and commit**

```bash
npm run test -w @argos-v2/web -- lib/calls/service.test.ts lib/call-delete-route.test.ts
npm run typecheck:web
git add apps/web/lib/calls apps/web/lib/call-delete-route.test.ts
git commit -m "Audit call deletion lifecycle"
```

### Task 4: Finish Authenticated UI Polish

**Files:**
- Modify: `apps/web/components/settings/people-panel.tsx`
- Modify: `apps/web/app/(authenticated)/calls/page.tsx`
- Modify: `apps/web/app/(authenticated)/highlights/page.tsx`
- Modify: notifications route/component found by `rg -n "Notifications|notification" apps/web`
- Test: matching panel/page tests under `apps/web/lib`

- [ ] **Step 1: Write static/render tests**

Add tests proving:

```ts
expect(html).toContain("Invite rep");
expect(html).toContain("Invite manager");
expect(html).not.toContain("Send invite"); // ambiguous label removed when context exists
expect(html).toContain('data-mobile-call-card="true"');
expect(html).toContain('data-highlight-selection-flow="explicit"');
expect(html).toContain('data-notification-filters="active"');
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
npm run test -w @argos-v2/web -- lib/people-panel.test.tsx lib/calls-filters-forge.test.tsx lib/primary-route-hero-removal.test.ts
```

- [ ] **Step 3: Implement minimal UI polish**

Use existing Forge components only. Do not add landing-page style sections. Keep tables dense on desktop and render stacked cards below `sm`.

- [ ] **Step 4: Verify render tests**

```bash
npm run test -w @argos-v2/web -- lib/people-panel.test.tsx lib/calls-filters-forge.test.tsx lib/primary-route-hero-removal.test.ts
npm run typecheck:web
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components apps/web/app/(authenticated) apps/web/lib
git commit -m "Polish authenticated workflow surfaces"
```

### Task 5: Browser QA Pass

**Files:**
- Create: `apps/web/tests/browser/authenticated-smoke.spec.ts` only if repo already has Playwright configured.
- Otherwise create no new browser test file and use the local `playwright` skill script for screenshots.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev:web
```

Expected: local Next app starts on an available port.

- [ ] **Step 2: Run desktop and mobile browser checks**

Use `playwright` or `browser-use` to check:

- `/login`
- `/onboarding`
- `/calls`
- `/calls/[known test id]` when seeded data exists
- `/settings/people`
- `/settings/integrations`
- `/settings/compliance`
- `/roleplay`

Desktop viewport: `1440x1000`.
Mobile viewport: `390x844`.

- [ ] **Step 3: Fix concrete UI failures only**

Only fix observed overlap, unusable controls, missing labels, or broken responsive layout. Add a regression test for each code fix.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "Verify authenticated browser flows"
```

### Task 6: Resolve Or Document Next/PostCSS Audit Risk

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`
- Create or modify: `docs/audits/dependency-risk-notes-2026-05-11.md`

- [ ] **Step 1: Recheck stable Next/PostCSS state**

Run:

```bash
npm view next version
npm view next@latest dependencies.postcss
npm audit --omit=dev --audit-level=moderate
```

- [ ] **Step 2: If latest stable Next uses `postcss >=8.5.10`, upgrade**

Run:

```bash
npm install next@latest -w @argos-v2/web
npm run verify
npm audit --omit=dev --audit-level=moderate
```

Commit if both pass.

- [ ] **Step 3: If only canary clears the advisory, do not upgrade without explicit approval**

Document:

```md
# Dependency Risk Notes - 2026-05-11

- `npm audit --omit=dev --audit-level=moderate` reports Next's nested `postcss <8.5.10`.
- Latest stable Next checked during this pass still vendors the affected PostCSS version.
- NPM's suggested remediation is not acceptable because it downgrades Next to 9.3.3.
- Canary upgrade requires product approval because it changes the framework stability channel.
```

- [ ] **Step 4: Commit accepted outcome**

```bash
git add apps/web/package.json package-lock.json docs/audits/dependency-risk-notes-2026-05-11.md
git commit -m "Record dependency audit decision"
```

### Task 7: Production Provider Verification

**Files:**
- Create: `docs/audits/production-verification-2026-05-11.md`

- [ ] **Step 1: Verify Vercel env/deployment**

Use `vercel:env-vars`, `vercel:deployments-cicd`, and `vercel:observability`.
Record:

- production deployment SHA
- `NEXT_PUBLIC_SITE_URL`
- Supabase URL presence
- `STRIPE_SECRET_KEY` presence
- `STRIPE_WEBHOOK_SECRET` presence
- OpenAI key presence
- Zoom env presence
- GHL disabled/enabled flag
- worker deployment target

- [ ] **Step 2: Verify hosted Supabase**

Use `supabase:supabase`.
Record:

- hosted signup disabled for public email signup
- invite-generated auth link works
- Google OAuth behavior
- migrations applied
- storage bucket access for `call-recordings`
- RLS/service-only table posture for billing, voice, processing jobs, audit events

- [ ] **Step 3: Verify Stripe**

Use `build-web-apps:stripe-best-practices`.
Record:

- webhook endpoint configured
- latest webhook delivery status
- checkout session creates customer/subscription metadata
- extra voice pack checkout grants minutes
- failed payment maps to inactive or blocked voice availability

- [ ] **Step 4: Verify OpenAI voice behavior**

Use `openai-docs` before changing behavior if docs have shifted.
Record:

- realtime session creation succeeds
- end-and-score stops browser audio
- completion settles one usage event
- quota exhausted blocks realtime/TTS before provider call

- [ ] **Step 5: Verify Zoom/GHL**

Record:

- Zoom OAuth callback configured
- Zoom webhook cap and generic errors still work
- GHL remains hidden/disabled unless `ARGOS_GHL_ENABLED=true` and required secrets exist

- [ ] **Step 6: Commit production verification artifact**

```bash
git add docs/audits/production-verification-2026-05-11.md
git commit -m "Document production verification"
```

### Task 8: Final Gate And Branch Finish

**Files:**
- No new files unless verification output changes docs.

- [ ] **Step 1: Run local gates**

```bash
npm run verify
npm audit --omit=dev --audit-level=moderate
```

Expected: `npm run verify` passes. Audit either passes or has the documented Next/PostCSS exception from Task 6.

- [ ] **Step 2: Run browser smoke**

Run the browser QA checklist from Task 5 on the final local or preview deployment.

- [ ] **Step 3: Confirm git state**

```bash
git status --short
git log --oneline --decorate --max-count=12
```

Only the two pre-existing untracked audit docs may remain untracked unless the user explicitly asks to stage them.

- [ ] **Step 4: Finish branch**

Use `superpowers:finishing-a-development-branch`.
Push or PR only after the user confirms the preferred release path.

---

## Self-Review

- Spec coverage: covers true voice settlement, export/delete/audit lifecycle, UI/browser QA, dependency audit decision, and production provider verification.
- Placeholder scan: no task uses "TBD" or asks for vague handling; each implementation task includes files, tests, commands, and expected behavior.
- Type consistency: `CallProcessingJob`, call export, audit event, and roleplay voice fields are introduced before dependent route/UI tasks.
