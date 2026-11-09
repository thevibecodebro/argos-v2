# Remaining Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Extend the shipped Argos design and usability pass to every remaining visible page and the uncovered loading, error, and not-found states.

**Architecture:** Preserve routes, permissions, data, business copy, and action behavior. Reuse the shipped Forge tokens and accessible controls for operational surfaces. Preserve the public site's approved composition while correcting concrete responsive, navigation, accessibility, and visual consistency gaps. Keep platform administration separate from tenant navigation.

**Tech Stack:** Existing Next.js App Router, React, TypeScript, CSS/Tailwind, Vitest. No dependency changes.

**Spec:** PRODUCT.md, DESIGN.md, the shipped source at dd1f224fbafbfd21ca0de55a0a8412122c3a5a2f, and the user's request for the same pass on untouched pages. Public reference: /Users/thevibecodebro/Projects/business/web_design/argos-homepage-preview/desktop-hero-final.jpg.

## Global Constraints

- Preserve existing destinations, server guards, authorization, request payloads, security behavior, billing behavior, and factual/legal copy.
- No live invites, MFA enrollment or verification, permission changes, organization creation, session termination, notifications, uploads, payments, integration syncs, or credentials.
- Test synthetic data in an isolated harness with blocked external effects. No secrets or real records in fixtures.
- Retain tenant theme support, reduced motion, visible keyboard focus, explicit labels, and mobile touch targets of at least 44px.
- Check 320, 390, 768, 1024, 1440, and 1920px; no page-level horizontal overflow, clipped primary actions, or fixed-height content traps.
- One writer per file. Root owns global styles, shared route states, preview harness, plans/evidence, Git, and deployment. Workers must preserve concurrent changes and use task-specific CSS modules if needed.
- No new visual-world selection or concept seed; this extends the accepted design. No backend, schema, dependency, environment, or credential changes.

## Review Focus

- Restricted or unauthenticated users must retain the same guards and recovery destinations.
- Long organizations, emails, errors, and validation messages must wrap without hiding controls.
- Narrow screens and zoom must preserve page tasks, not merely hide overflowing tables.
- Slow, empty, error, and missing-record states must retain one clear title and recovery action.
- Auth, MFA, invite, billing, and administrative UI must not create effects merely for visual QA.

### Task 1: Platform console

**Files:** components/platform/platform-shell.tsx, platform-organization-switcher.tsx, platform-dashboard-page.tsx, platform-organizations-page.tsx, platform-create-organization-page.tsx, platform-organization-detail-page.tsx, platform-staff-page.tsx, platform-sessions-page.tsx under apps/web; task-specific CSS module and focused platform component tests as needed. Route wrappers under apps/web/app/platform excluding mfa only if necessary for presentation.

**Interfaces:** Keep public component exports and props. Consume existing Forge tokens and controls. Root owns globals.css and preview harness; do not edit those. MFA belongs to Task 2.

- [x] Inspect source and existing component/test patterns; identify redundant headers, decorative metrics, nested frames, and mobile table/control gaps.
- [x] Apply the existing compact operational page hierarchy across all six console pages and the shell. Keep genuine operational counts when useful. Preserve every action, field, link, and guard.
- [x] Add or adjust meaningful tests for exposed navigation, form semantics, permission-limited actions, and responsive structural alternatives. Run affected tests and diff check.
- [x] Return exact changed paths, verification commands/results, and any material limitations. Do not commit, publish, deploy, or use a browser.

### Task 2: Entry, access and MFA flows

**Files:** apps/web/app/login/page.tsx, onboarding/page.tsx, invite/[token]/page.tsx and invite-accept-button.tsx, access-pending/page.tsx, auth/error/page.tsx, platform/mfa/setup/page.tsx, platform/mfa/verify/page.tsx, platform/mfa/mfa-code-form.tsx; apps/web/components/auth/login-form.tsx, onboarding-panel.tsx, invite/invite-access-shell.tsx and its CSS module. AuthShell section of components/legacy-shell.tsx only if necessary; do not change other exports. New task-specific entry surface/CSS module and focused auth/onboarding/invite/MFA presentation tests as needed.

**Interfaces:** Preserve server actions/guards, redirects, validation, autocomplete, and provider behavior. Expose pure presentation components where necessary for safe synthetic preview, with unchanged production props/behavior. No global CSS edits.

- [x] Inspect every existing state, including sign-in errors, onboarding steps, invitation status, denied access, MFA validation/recovery, and auth error.
- [x] Use the accepted neutral surfaces, concise hierarchy, form sizing, borders, typography, and accessible controls. Remove obsolete dark/glow/hero treatment from operational entry flows; preserve exact factual copy and account behavior.
- [x] Keep security and provisioning functions unchanged. Never open real invite or MFA setup URLs: those may auto-accept/enroll during render.
- [x] Run focused existing tests plus meaningful form/a11y regressions for any changed behavior. Return changed paths, results and pure preview entry points. No commit, publication, deployment, or browser use.

### Task 3: Public and legal pages

**Files:** apps/web/components/public/landing-page.tsx, landing-page.module.css, product-showcase.tsx, legal-page.tsx, legal-links.tsx and their task-specific styles; apps/web/app/page.tsx and the three legal page wrappers only if necessary. Preserve all legal page content, metadata/JSON-LD, and public marketing claims/assets. Do not edit ArgosLogo, global CSS, or legacy-shell.

**Interfaces:** The public site keeps its approved visual identity and destination links. Do not add authenticated app chrome. Do not alter global theme styles or other workers' components.

- [x] Compare the current homepage and three legal pages with the approved business/web_design reference and shipped source.
- [x] Correct only concrete responsive, readability, focus, target-size, and navigation gaps; bring legal reading layouts and controls to the same quality bar.
- [x] Preserve every existing claim, price, legal paragraph, destination, and interaction. Do not add fabricated product promises or new sections.
- [x] Run focused checks and provide a concise diff/coverage report. No live actions or browser use.

### Task 4: Shared alternate states and integration

**Files:** apps/web/components/authenticated-route-state.tsx, authenticated-route-error.tsx, panel-loaders/panel-skeleton.tsx, covered route loading/error/not-found files where necessary; root-owned .codex-build synthetic harness and verification evidence.

**Interfaces:** Match each existing page's task and shared AppShell/Settings layout. Preserve recovery actions and error reset behavior. Avoid duplicating skeleton work already accurate for Training.

- [x] Replace stale ornamental generic loading and duplicate error/empty headers with coherent task-specific states.
- [x] Extend isolated preview coverage to remaining visible pages and representative alternate states. Prove external effects are blocked before browser interactions.
- [x] Capture one batched desktop/mobile pass and intermediate measurements; fix material issues in one batch, then confirm affected views once.
- [x] Run affected tests, full web suite, serialized production build/typecheck, and diff check. Freeze exact source and request independent source/visual review.
- [x] Reconcile all 44 page routes, redirects, gated internal capture, and alternate states. Prepare a reviewable release; apply the user's existing deployment authorization only within its established scope and obtain any missing approval for materially expanded live targets after preparation.

## Execution rulings

- The user explicitly requested the same established pass and authorized independent delegation in AGENTS.md; no additional concept or execution-method approval is needed. Non-overlapping implementation tasks can run in parallel under one writer per file.
- Public/legal and platform pages are newly included in local design scope. Existing deployment approval named Roleplay, surrounding workspace pages, and tenant admin settings; do not silently assume it authorizes unrelated live account actions or authentication side effects.
- Root remains the only browser owner. Preserve the user's live page and use a separate isolated task preview for risky states.

## Verified implementation

The 17 remaining visible routes and shared alternate states now use the existing design language. Source and visual review are complete. The final source passed 1,353 web tests, the production build and typecheck; the isolated preview passed 28 guard/navigation tests and a separate build. Browser evidence covers six widths from 320–1920px, long organization names, keyboard navigation, 320px-high desktop rails, short phone dialogs, carousel motion controls and alternate states. Authentication and administrative effects were tested only as isolated presentation behavior; server guards/actions and legal/product claims are unchanged.

The user’s request to apply the same pass to untouched pages continues the previously authorized Argos UI deployment to the existing production domain. No live account, MFA, invitation, billing or permission operation is part of this release.
