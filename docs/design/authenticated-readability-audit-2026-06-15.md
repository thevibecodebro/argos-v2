# Authenticated Readability Audit

Date: 2026-06-15

Worktree: `/Users/thevibecodebro/Projects/argos-v2/.worktrees/backend-ux-mockups`

Scope: authenticated tenant product UI, including shell, dashboard, calls, call detail, highlights, upload, roleplay, training, team, leaderboard, notifications, and settings.

Implementation verification: see `docs/design/authenticated-page-readability-verification-2026-06-15.md`.

## Executive Diagnosis

The authenticated app has useful workflows, but the UI is still harder to read than it should be because it overuses support chrome. Most pages follow this pattern:

1. Framed toolbar.
2. Metric strip.
3. Framed table or workbench.
4. Right drawer.
5. Nested summary cards or rows.

That creates a "stack of panels" even when the underlying workflow is simple. The issue is not the data model or route structure. The issue is visual hierarchy and composition discipline.

The product should move from "Forge command workspace" to operational readability: quieter dark surfaces, fewer framed layers, smaller headers, object-first pages, and real controls only.

## Current Evidence

- `apps/web/components/operational-workspace.tsx` makes the toolbar, metric strip, and drawer all framed surfaces by default.
- `apps/web/app/(authenticated)/dashboard/page.tsx` leads with a toolbar and metrics before the attention queue.
- `apps/web/app/(authenticated)/calls/page.tsx` includes toolbar tabs, filters, metrics, table, drawer, and pagination.
- `apps/web/app/(authenticated)/calls/[id]/page.tsx` repeats call status in toolbar, metric strip, and drawer before the detail panel.
- `apps/web/app/(authenticated)/highlights/page.tsx` uses metrics and a drawer for what should primarily be a coaching-evidence table.
- `apps/web/app/(authenticated)/upload/page.tsx` uses a metric strip to explain steps that the upload form already shows.
- `apps/web/app/(authenticated)/notifications/page.tsx` uses filters and metrics that compete with the inbox list.
- Settings routes use the correct secondary rail idea, but several pages still stack framed panels inside framed panels.

## P0 Findings

### 1. Shared Operational Primitives Are Too Heavy

Problem: `OperationalToolbar`, `OperationalMetricStrip`, and `OperationalPreviewDrawer` are all styled as standalone panels. When every page uses all three, the main work object competes with support chrome.

Fix:

- Make the default toolbar unframed.
- Make metric strips opt-in, not default.
- Make drawers visually quieter and sticky only where selection matters.
- Move controls into the table/list header instead of inside a large page header.

Acceptance:

- A standard list page can render as `header -> controls -> table`, with no metric strip or drawer required.

### 2. Metric Strips Are Used As Decoration

Problem: Many pages show four metrics even when those metrics do not change the next action.

Remove or demote metric strips on:

- Upload
- Notifications
- Call detail
- Settings detail routes
- Highlights
- Roleplay default view

Keep metric strips only on:

- Dashboard when tied to the attention queue.
- Team when it helps triage risk.
- Leaderboard if it clarifies rank context.

### 3. Page Headers Still Explain Too Much

Problem: Page headers often describe the feature instead of orienting the task.

Fix:

- Title: short object name.
- Description: one sentence max.
- One primary action.
- No "workspace" labels unless they clarify role or scope.

### 4. The Main Object Is Often Not First

Problem: Users have to parse toolbar, metrics, and status cards before reaching the table, transcript, inbox, or form.

Fix:

- Calls: table first after filters.
- Call detail: transcript/evidence workbench first.
- Upload: upload form first.
- Notifications: inbox list first.
- Settings: active configuration panel first.

## P1 Route Audit

### Dashboard

Current issue: It still reads as a dashboard instead of a task queue. Metrics appear before the queue.

Target: "Today" style attention queue. Lead with items requiring action. Metrics become compact context or move to Team/Reports later.

Action:

- Rename visible experience to Today only when the route implementation follows the queue-first pattern.
- Keep role-specific copy.
- Remove duplicate role/status chips if the queue already shows role context.

### Calls

Current issue: Strongest candidate for a route pattern, but still has too many layers: tabs/filters/metrics/table/drawer.

Target: Search/filter row and call table. Drawer optional after selection.

Action:

- Remove metric strip by default.
- Keep one saved-view row only if it maps to real route filters.
- Put filters directly above the table.
- Reduce table to primary columns: Call, Rep, Score, Status, Uploaded, Action.
- Make row click/open behavior obvious.

### Call Detail

Current issue: Repeats status and summary in toolbar, metric strip, and drawer. The call detail panel should own the page.

Target: Evidence workbench.

Action:

- Remove metric strip.
- Keep breadcrumb and compact title only.
- Put score/status near the evidence/transcript where it is used.
- Right pane should focus on coaching actions, not duplicated metadata.

### Highlights

Current issue: The page is really coaching evidence, but it still says Highlights and uses metrics plus drawer as decoration.

Target: Coaching evidence table.

Action:

- Rename visible label to Coaching in a later approved route/IA pass.
- Remove metric strip unless there is a real manager triage decision.
- Make source call the primary action.
- Do not show top filters unless they work.

### Upload

Current issue: Step metrics duplicate the upload form.

Target: Single upload form with readiness help inline.

Action:

- Remove metric strip.
- Remove right drawer unless needed for compliance/accepted file copy.
- Put accepted formats, size limit, and consent/context help directly near the file input.

### Roleplay

Current issue: Metrics and persona counts compete with the active simulation.

Target: Active simulation surface first.

Action:

- Remove metric strip from default view.
- Make persona/scenario selection compact.
- Keep session history behind `History` or below active session.
- Use serious practice language, not playful card-gallery language.

### Training

Current issue: Learner flow is useful, but the wrapper adds metric chrome before modules.

Target: Lesson/module progress first.

Action:

- Remove metric strip for reps.
- For managers, move assignment/team progress into contextual actions or the manager route.
- Keep curriculum/builder separate.

### Team

Current issue: Team is structurally close, but metrics and drawer can overshadow roster scan.

Target: Roster/risk table first.

Action:

- Keep a small risk summary only if it helps managers prioritize.
- Make selected rep drawer contextual and non-duplicative.
- Avoid making leaderboard/training/roleplay primary actions in the header unless the user is in that workflow.

### Leaderboard

Current issue: Good rank-table direction, but tabs and static filter chips risk becoming fake controls.

Target: Rank table with real filters only.

Action:

- Remove inert chips or wire them to query state.
- Keep one metric strip only if it clarifies the selected rank view.
- Otherwise table and rank categories are enough.

### Notifications

Current issue: Metrics and inert category chips make a simple inbox feel like a dashboard.

Target: Inbox.

Action:

- Remove metric strip.
- Keep All/Unread only if functional.
- Group by date and show unread/category status inline.
- Drawer optional only if selecting a notification does not navigate.

### Settings

Current issue: Correct secondary rail direction, but account/settings pages still show maps, inline detail panels, preview drawers, and nested cards at once.

Target: Settings rail plus one active configuration surface.

Action:

- Do not show settings map and account panel on the same default page unless the map is the page.
- Use dense forms/tables.
- Preview drawer only for status/readiness.
- Avoid card stacks in people, teams, permissions, and rubrics.

## P2 Supporting Cleanup

- Reduce uppercase label usage across table cells, chips, and mobile cards.
- Standardize all repeated row cards with one mobile pattern.
- Keep icon usage restrained. Icons should identify action/type, not decorate every fact.
- Remove fake tabs, filters, and chips until backed by route state or client state.
- Replace repeated "Selected item" drawers with specific labels like "Selected call", "Selected rep", or "Source call".
- Standardize empty states: missing object, why it is missing, one next action.

## Design System Contract

The root `PRODUCT.md` and `DESIGN.md` files are now the source of truth for future authenticated work. The key rule is:

> Optimize for the primary work object first. Add metrics, drawers, and extra controls only when they reduce decision time.

Implementation work should follow this order:

1. Shared primitives: toolbar, metric strip, drawer, table shell, mobile rows.
2. Calls route as the pattern route.
3. Call detail workbench.
4. Dashboard/Today queue.
5. Team and coaching evidence.
6. Settings.
7. Upload, notifications, training, roleplay, and leaderboard.

## Verification Requirements

Before any route is called complete:

- Focused route render tests pass.
- Typecheck passes.
- `git diff --check` passes.
- Desktop and mobile screenshots are reviewed.
- First viewport passes the readability check:
  - One primary object is obvious.
  - No nested cards.
  - No fake controls.
  - No duplicated metric/status facts.
  - No large decorative header panel.
