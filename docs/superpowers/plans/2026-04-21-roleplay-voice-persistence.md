# Roleplay Voice Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live voice roleplay persist spoken turns into the saved roleplay session so history, reloads, and scoring reflect what was actually said.

**Architecture:** Keep the current web-based realtime voice path in place. Add a server append path for voice transcript turns, update the roleplay service to support transcript-only appends without generating a synthetic reply, and have the client queue parsed realtime turns to that endpoint with light duplicate protection.

**Tech Stack:** Next.js App Router, React client components, Vitest, existing roleplay service/repository layer

---

### Task 1: Service Support For Voice Transcript Turns

**Files:**
- Modify: `apps/web/lib/roleplay/service.ts`
- Test: `apps/web/lib/roleplay/service.test.ts`

- [ ] Add a failing service test for appending a single voice turn without generating a second assistant response.
- [ ] Run: `npm run test:web -- --run apps/web/lib/roleplay/service.test.ts`
- [ ] Implement a transcript-append service function that:
  - validates access and active status
  - appends exactly one provided `RoleplayMessage`
  - treats a consecutive identical role/content pair as a no-op
- [ ] Re-run: `npm run test:web -- --run apps/web/lib/roleplay/service.test.ts`

### Task 2: API Route For Persisting Voice Turns

**Files:**
- Create: `apps/web/app/api/roleplay/sessions/[id]/transcript/route.ts`
- Test: `apps/web/lib/roleplay-voice-routes.test.ts`

- [ ] Add a failing route test for posting a voice transcript turn.
- [ ] Run: `npm run test:web -- --run apps/web/lib/roleplay-voice-routes.test.ts`
- [ ] Implement an authenticated POST route that accepts `{ role, content }`, calls the new service function, and returns the updated session.
- [ ] Re-run: `npm run test:web -- --run apps/web/lib/roleplay-voice-routes.test.ts`

### Task 3: Client Persistence From Realtime Events

**Files:**
- Modify: `apps/web/components/roleplay-panel.tsx`
- Test: `apps/web/lib/roleplay-panel.test.ts`

- [ ] Add a focused UI regression test only if the rendered output changes.
- [ ] Implement a queued client persistence path that posts parsed realtime turns to the new route.
- [ ] Keep duplicate protection local so repeated identical realtime events do not double-append.
- [ ] Reconcile the returned session into local state so persisted voice turns survive reload and `End & Score`.

### Task 4: Verification

**Files:**
- Verify only

- [ ] Run: `npm run test:web -- --run apps/web/lib/roleplay/service.test.ts apps/web/lib/roleplay-voice-routes.test.ts apps/web/lib/roleplay-panel.test.ts`
- [ ] Run: `npm run typecheck:web`
- [ ] Run: `npx gitnexus detect-changes --repo argos-v2` or closest available scope check command if CLI syntax differs.
- [ ] Confirm only the expected roleplay voice/session persistence files changed.
