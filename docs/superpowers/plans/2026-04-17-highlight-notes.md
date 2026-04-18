# Highlight Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the highlight note feature so managers with highlight permission can add, edit, and remove notes from the UI, and notes render consistently anywhere highlights are shown.

**Architecture:** Reuse the existing `highlightNote` field on `call_moments` and the existing highlight patch route instead of inventing a second note model. Tighten the UI around the real permission contract, add explicit note save/remove actions on call detail, and extract shared highlight note rendering so the call detail and highlights feed stay visually consistent.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, existing calls/access services.

---

## File Map

- Modify: `apps/web/lib/calls/service.ts`
  Add a lightweight exported helper for whether the current actor can manage highlights for a given call/rep context.
- Modify: `apps/web/app/(authenticated)/calls/[id]/page.tsx`
  Pass the real highlight-management capability into the detail panel instead of role-label gating.
- Modify: `apps/web/components/call-detail-panel.tsx`
  Add explicit save/edit/remove note controls for highlighted moments and remove half-wired behaviors.
- Create or modify: `apps/web/components/highlight-note.tsx`
  Shared lightweight rendering for highlight note display across surfaces.
- Modify: `apps/web/app/(authenticated)/highlights/page.tsx`
  Use the shared note renderer so note presentation matches call detail.
- Modify: `apps/web/lib/calls/service.test.ts`
  Cover capability helper behavior.
- Create or modify: `apps/web/lib/call-detail-panel.test.tsx`
  Cover add/edit/remove note UI lifecycle and dead-control cleanup.
- Create or modify: `apps/web/lib/highlights-page.test.tsx`
  Cover consistent note rendering in highlight views if a page/component test exists or is cheap to add.

## Tasks

### Task 1: Lock the permission contract in tests
- [ ] Add failing service tests showing only admins and managers with `manage_call_highlights` can manage highlight notes for a call.
- [ ] Run the targeted service tests and confirm they fail for the missing exported capability helper.

### Task 2: Add the minimal capability helper
- [ ] Export a narrow helper from `apps/web/lib/calls/service.ts` that resolves access context for a call and returns whether highlight management is allowed.
- [ ] Keep existing backend mutation behavior unchanged.
- [ ] Run the targeted service tests and confirm they pass.

### Task 3: Add failing UI lifecycle tests
- [ ] Add failing component tests for call detail showing managers can save a note when highlighting, edit an existing highlight note without un-highlighting, remove only the note while keeping the highlight, and do not see highlight controls without permission.
- [ ] Add or extend a highlight view test to prove note rendering is shared/consistent.
- [ ] Run those tests and confirm they fail for the current UI.

### Task 4: Implement the UI lifecycle with minimal code
- [ ] Refactor the call detail panel to separate highlight toggle from note save/remove actions.
- [ ] Reset local note draft state after successful saves and preserve optimistic editing behavior.
- [ ] Replace role-only gating with the real capability from Task 2.
- [ ] Extract shared highlight note rendering and use it in call detail and highlights feed.
- [ ] Run the targeted UI tests and make them pass.

### Task 5: Verify end-to-end affected scope
- [ ] Run the full targeted test set for calls/highlights UI and service behavior.
- [ ] Run `npm run typecheck:web`.
- [ ] Summarize traced flow, dead code/half-wired behaviors removed, patches applied, and tests added.
