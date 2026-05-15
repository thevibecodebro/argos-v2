# Role-Aware Onboarding Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a role-aware, dismissible authenticated onboarding guide for Argos reps and admins without touching auth, billing, invite acceptance, or schema.

**Architecture:** Add one focused client component, `RoleOnboardingGuide`, and mount it from `AuthenticatedAppShell`. The shell passes user id, email, role, and route context; the guide owns local dismiss/replay state with a per-user localStorage key.

**Tech Stack:** Next.js App Router, React client components, Vitest server-render tests, existing Forge/Operational design tokens.

---

### Task 1: Add Failing Shell Tests

**Files:**
- Modify: `apps/web/lib/app-shell.test.ts`

- [ ] Add tests asserting that admin users see workspace launch guidance and a replay menu item.
- [ ] Add tests asserting that rep users see rep-specific guidance and not admin setup language.
- [ ] Run `npm run test -w @argos-v2/web -- lib/app-shell.test.ts` and confirm the new tests fail before implementation.

### Task 2: Add Guide Component

**Files:**
- Create: `apps/web/components/role-onboarding-guide.tsx`

- [ ] Implement role-specific guide content in a small data structure.
- [ ] Implement client-only localStorage dismissal using `argos.onboardingGuide.<userId>.<role>`.
- [ ] Render an inline operational panel with checklist links and dismiss action.
- [ ] Expose a reusable button/action path so the account menu can replay the guide.

### Task 3: Wire Shell Integration

**Files:**
- Modify: `apps/web/components/app-shell.tsx`
- Modify: `apps/web/components/authenticated-app-chrome.tsx`
- Modify: `apps/web/app/(authenticated)/layout.tsx`

- [ ] Add `id` to the shell user shape.
- [ ] Pass `currentUser.id` from the authenticated layout.
- [ ] Mount `RoleOnboardingGuide` above page children inside `<main>`.
- [ ] Add a `Product guide` account menu button that reopens the guide.

### Task 4: Verify

**Commands:**
- `npm run test -w @argos-v2/web -- lib/app-shell.test.ts`
- `npm run typecheck:web`

- [ ] Confirm focused tests pass.
- [ ] Confirm TypeScript passes.
- [ ] Inspect `git diff --check`.
