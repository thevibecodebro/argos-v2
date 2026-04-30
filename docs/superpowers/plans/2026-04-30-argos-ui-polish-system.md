# Argos UI Polish System Implementation Plan

## Summary
Fix the full UI audit as a single UI-only PR, using sequential subagent-driven development. The work standardizes Argos around the Forge design system, repairs responsive layout issues, improves accessibility/status handling, and tightens product polish without changing business logic, routes, APIs, auth, schema, scoring, or data contracts.

Execution starts from `/Users/thevibecodebro/Projects/argos-v2` on `main`, with implementation isolated in `/Users/thevibecodebro/Projects/argos-v2/.worktrees/argos-ui-polish-system` on `feature/argos-ui-polish-system`.

## Subagent Workflow
- Run baseline checks before UI edits: `npm run typecheck:web`, focused UI tests, and `git diff --check`.
- Execute one implementation subagent at a time. Each subagent gets only the task spec it owns, must not revert other work, and must commit its changes before review.
- After every task, run two fresh review subagents: first spec compliance, then code quality. Any issues go back to the original implementer before the next task starts.
- After all tasks pass, run final full verification and use `superpowers:finishing-a-development-branch` to present merge/PR options.

## Interfaces And Shared UI Changes
- Add `AuthenticatedPageContainer` in `apps/web/components/authenticated-page-container.tsx` with `size: "standard" | "wide"`, consistent `px-4 sm:px-6 lg:px-8`, and no page-specific desktop-only padding.
- Extend `apps/web/components/forge.tsx` with accessible status behavior: `ForgeStatusPanel announce="off" | "polite" | "assertive"`, `ForgeSkeleton label`, and shared `ForgeScoreMeter` / `ForgeStatCard` primitives where repeated local stat/meter styles exist.
- Keep all public routes, API shapes, database behavior, auth behavior, and scoring logic unchanged.

## Implementation Tasks
1. Setup And Baseline
   - Controller only: create the branch/worktree, install nothing unless dependencies are missing, and record baseline test output.
   - Acceptance: clean isolated branch, no detached-head edits, baseline failures documented before UI work.

2. Authenticated Page Rhythm
   - Own page frames and route wrappers including dashboard, calls, call detail, highlights, leaderboard, roleplay, team, training, and settings surfaces under `apps/web/app/(authenticated)`.
   - Replace scattered `px-12`, one-off `mx-auto`, and inconsistent max-width wrappers with `AuthenticatedPageContainer`.
   - Acceptance: authenticated pages share the same mobile/desktop gutter rhythm and no content relies on desktop-only horizontal padding.

3. Forge Accessibility Primitives
   - Update Forge primitives so async status, error, loading, and metric displays have correct semantics by default.
   - Add/adjust tests in `apps/web/lib/forge-primitives.test.tsx`, `apps/web/lib/page-frame.test.tsx`, and related component tests.
   - Acceptance: loading states expose readable labels, error states announce assertively, and decorative chrome remains hidden from assistive tech.

4. Forms, Buttons, Labels, And Statuses
   - Audit upload, onboarding, call detail notes, training, settings/rubrics, and roleplay inputs.
   - Add missing visible labels or `aria-label`s, convert transient success/error text to live regions, and remove or clearly disable non-functional icon actions.
   - Acceptance: every input/control has an accessible name; async success/error states are announced; no dead buttons remain clickable.

5. Roleplay Mobile And Keyboard UX
   - Refactor `apps/web/components/roleplay-panel.tsx` so mobile users get a practical `Scenario / Practice / Score` structure while desktop keeps the dense workspace layout.
   - Add keyboard-safe focus order, textarea labels, transcript landmarks, live voice/status announcements, and responsive controls that do not crowd or overflow.
   - Acceptance: roleplay is usable at 360px width, all primary controls are reachable by keyboard, and status/error changes are announced.

6. Call Detail And Upload Polish
   - Tighten `apps/web/components/call-detail-panel.tsx` and `apps/web/components/upload-call-panel.tsx`.
   - Replace vague media/analysis states with explicit Forge empty/loading/error/status panels; render playback only when existing data already supports it, otherwise show a clear unavailable state.
   - Acceptance: users can distinguish uploading, processing, failed, empty, unavailable, and ready states without guessing.

7. Pre-Auth And Onboarding Alignment
   - Align login/onboarding and public pre-auth shells with Forge typography, surfaces, focus treatment, and color tokens.
   - Remove deprecated auth/landing CSS only after verifying no references remain; otherwise migrate the references in the same task.
   - Acceptance: public, auth, and authenticated surfaces feel like one product while preserving current copy and flows.

8. Design-System Consolidation
   - Replace page-local stat cards, meters, badges, tables, and empty panels with Forge primitives where behavior matches.
   - Keep operational density; do not turn product pages into marketing layouts.
   - Acceptance: fewer one-off color/spacing patterns, consistent cards/tables/buttons, and no nested decorative card stacks.

9. Loading, Error, Empty, And Responsive QA
   - Add or normalize route/component loading, error, and empty states for core authenticated flows.
   - Run responsive checks at 360px, 768px, 1280px, and 1440px. Capture screenshots for public/login and authenticated routes when a local auth path is available; otherwise rely on component render tests and document the browser-auth gap.
   - Acceptance: no overlapping text, no horizontal overflow, and all empty/error states explain the next reasonable action.

## Verification Plan
- Per task: run relevant focused tests plus `git diff --check`.
- Before final handoff: run `npm run typecheck:web`, `npm run test:web -- lib/forge-primitives.test.tsx lib/page-frame.test.tsx lib/upload-call-panel.test.tsx lib/call-detail-panel.test.tsx lib/roleplay-panel.test.ts lib/training-panel.test.tsx lib/team-views.test.tsx lib/rubrics-panel.test.tsx lib/primary-route-hero-removal.test.ts lib/authenticated-forge-token-coverage.test.ts`, and `npm run build:web`.
- Use Playwright or browser-use screenshots after the dev server is running, covering at least homepage/login plus the main authenticated surfaces if auth/session setup is available.

## Top Five Fixes To Prioritize
1. Standardize authenticated page padding and max-width with one shared container.
2. Add accessible live announcements for loading, success, and error states.
3. Rework roleplay mobile layout and keyboard/focus behavior.
4. Replace local card/table/meter styles with Forge primitives.
5. Align pre-auth, onboarding, and product surfaces around one token system.
