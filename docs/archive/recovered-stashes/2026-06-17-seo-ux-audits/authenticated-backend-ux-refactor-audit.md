# Authenticated Backend UX Refactor Audit

Date: 2026-06-15

Scope: all authenticated backend/product routes in `apps/web/app/(authenticated)`, plus shared shell and product UI primitives in `apps/web/components`.

Audience: sales managers, sales reps, admins, and executives. The product should feel like a calm sales-coaching workspace: simple to navigate, fast to scan, and action-first.

Constraint: this is an audit and refactor blueprint. It does not change implementation.

## Executive Verdict

The authenticated app has a solid Forge foundation now: shared shell, shared operational toolbar, shared metrics, shared preview drawers, loading states, empty states, and route-level tests exist. The problem is no longer visual inconsistency at the token level.

The main problem is product-model complexity. The app is organized around routes and feature names, while managers and reps think in daily jobs:

- What needs attention today?
- Which call should I review?
- Which rep is at risk?
- What coaching action should happen next?
- What did I assign, and did it work?

GoHighLevel's useful lesson is not the exact CRM feature set. It is the structure: a simple left module rail, page-local tabs/saved lists, a dense list or inbox as the main object, a right-side context panel, and one obvious primary action.

Argos already has many of those pieces, but they are not yet enforced as a single interaction contract.

## External UX References

These are the GoHighLevel patterns worth borrowing:

- Conversations: four-panel layout, advanced filtering, and a unified right context panel. Source: https://help.gohighlevel.com/support/solutions/articles/155000006610-getting-started-with-the-conversations-tab
- Contact detail: three-panel workspace, critical data surfaced at a glance, and remembered view preferences. Source: https://help.gohighlevel.com/support/solutions/articles/155000006651-contacts-all-new-contact-detail-page
- Smart Lists: saved filtered views users can return to instead of rebuilding filters. Source: https://help.gohighlevel.com/support/solutions/articles/48001062094-how-to-create-manage-smart-lists
- Task list: list view with filters, sorting, and bulk actions at the top of the list. Source: https://help.gohighlevel.com/support/solutions/articles/155000004498-task-management
- Header simplification: less-used management actions moved into an action menu beside the main action. Source: https://help.gohighlevel.com/support/solutions/articles/155000006513--add-contact-form-upgrade-and-customizations

## Live GoHighLevel Review Notes

Live review was done in Comet against both Agency View and the fuller C-Love Sub-Account view. The earlier sidebar direction should be corrected based on the actual GHL pattern.

### Agency View Pattern

Agency View is not a deeply grouped admin sidebar. It is a separate shell with a flat agency nav:

- account/location switcher at the top
- simple module list: agency dashboard, prospecting, sub-accounts, snapshots, reselling, add-ons, marketplace/library/education-type resources
- settings in the footer
- agency dashboard page starts with a compact title, a period/control row, summary metric cards, then charts
- sub-accounts page is title/count/action plus account cards, each with one obvious "Switch to Sub-Account" action

Implication for Argos: the future super-admin/agency space should be a separate platform shell. Do not bolt agency controls onto the normal manager/rep workspace.

### Sub-Account Pattern

The C-Love Sub-Account uses a flat, literal module rail:

- account switcher at the top
- search/command entry below it
- quick action button beside search
- flat module list ordered by work frequency
- one visual divider between core operational modules and lower-frequency modules
- settings pinned in the footer

The important detail: GHL does not use the primary sidebar for abstract grouped concepts. It uses simple product nouns such as Dashboard, Conversations, Contacts, Opportunities, Reporting, and Settings. Complexity moves inside the selected module.

### Page Pattern

Across Launchpad, Dashboard, Conversations, Contacts, Opportunities, Forecast, Reporting, Call Report, Marketing, Automation, and Settings, GHL repeats the same simplification rules:

- the page title is short
- page-local tabs sit horizontally under the title
- the main object appears quickly: inbox, table, board, chart grid, or settings form
- filters/search/date controls sit close to the object they affect
- one primary action is visible; extra actions move to overflow
- explanatory copy is rare and mostly reserved for setup or empty/overview states
- settings swaps the main product rail for a settings-specific rail with a Go Back control
- complex builders still start from a simple saved-list/table surface before opening the editor

Implication for Argos: the sidebar should be flatter than originally proposed. The product should get simpler through module-local tabs, saved views, and object-first pages, not through more sidebar taxonomy.

## Verification Snapshot

- `npx impeccable --json "apps/web/app/(authenticated)" ...` returned `[]`.
- `npm run typecheck -w @argos-v2/web` passed.
- Focused frontend tests passed: `app-shell`, `settings-nav`, `roleplay-panel`, `training-panel`, `team-views`, `upload-call-panel`, `calls-filters`, and `call-detail-page-forge`.
- Result: the refactor should focus on UX model, IA, component contracts, and decomposition. It is not a rescue mission for broken TypeScript or obvious deterministic design violations.

## Current Feature Inventory

| Area | Routes | Primary user job | Current health |
| --- | --- | --- | --- |
| Today / Dashboard | `/dashboard` | Decide what needs attention now | Useful queue exists, but the page is still labeled and structured as a generic dashboard |
| Call Review | `/calls`, `/calls/[id]`, `/upload` | Upload, find, review, annotate, and coach from calls | Strongest workflow, but list selection and contextual actions need a real shared contract |
| Coaching Evidence | `/highlights` | Reuse saved coaching moments | Useful library, but should probably become part of Coaching instead of a top-level route |
| Roleplay | `/roleplay`, `/roleplay/history` | Practice from scenarios or generated call evidence | Powerful, but currently isolated from the coaching loop |
| Training | `/training`, `/training/team`, `/training/builder` | Complete, assign, and author training | Functionally rich, but too much product logic lives in one component family |
| Team | `/team`, `/team/[repId]`, `/leaderboard` | Identify rep risk and review performance | Manager-relevant, but split into separate roster/rank/profile pages without one coaching cockpit |
| Notifications | `/notifications` | See activity and jump to related work | Real inbox behavior, but page-level context drawer is not tied to client selection |
| Admin | `/settings/*` | Manage people, teams, permissions, integrations, rubrics, compliance | Feature-complete, but should be mentally separate from manager/rep daily work |

## P0 Refactor Thesis

Do not start by restyling every page. Start by changing the product contract.

Recommended standard account shell:

1. Account/team switcher.
2. Search/command entry.
3. Quick action: `Upload call`.
4. Flat primary nav:
   - `Today` - current `/dashboard`; daily work queue and risk summary.
   - `Calls` - call library, upload action, call detail review.
   - `Coaching` - moments, assigned training, roleplay, team progress.
   - `Team` - roster, rep profiles, leaderboard/risk for managers/admins.
   - `Reports` - measurement views such as call report, trends, team outcomes, and exports when those surfaces are ready.
5. Footer utility:
   - `Settings` or `Admin`, role-gated; opens the separate settings/admin shell.

Do not create grouped sidebar sections such as "Review", "Coach", or "People". GHL's simplicity comes from flat, literal modules plus page-local tabs.

Demote `Upload`, `Highlights`, `Roleplay History`, `Team Progress`, `Curriculum`, leaderboard variants, reports variants, and settings subpages from primary navigation into page-local tabs, buttons, saved views, or secondary rails.

Keep existing routes during the refactor for safety, but make the visible IA match the mental model above.

Recommended future platform/agency shell:

1. `Platform Dashboard`
2. `Organizations`
3. `Users`
4. `Plans & Billing`
5. `Integrations`
6. `Templates`
7. footer `Settings`

This must be a separate shell from the standard account workspace.

## Critical Findings

### P1: The "Work Queue" Exists, But It Is Not Yet the Product Home

Evidence:

- `apps/web/app/(authenticated)/dashboard/page.tsx` builds role-aware queue items.
- Manager queue items include reps needing coaching, remaining coaching flags, no calls this month, and roleplay not started.
- Rep queue items include recent calls and focus areas.
- Executive queue items include training completion and weak skill patterns.

Problem:

The queue is hidden behind the label `Dashboard`, placed after a metric strip, and its right drawer previews the first item instead of a user-selected item.

Decision:

Rename the visible product concept to `Today`. Make the queue the first-class object. Metrics should support the queue, not lead the page.

Expected end state:

- First row: "Needs attention" queue with saved views such as `All`, `At risk`, `Calls`, `Training`, `Roleplay`, `Setup`.
- Right panel: selected queue item with next action, evidence, owner, and due/age.
- Manager language: "3 reps need coaching", not "Dashboard".
- Rep language: "Next practice", "Review latest score", "Finish assigned module".

### P1: Page-Level Preview Drawers Often Fake Selection

Evidence:

- `/dashboard` uses `queueItems[0]`.
- `/calls` uses the first call row.
- `/highlights` uses `highlights[0]`.
- `/roleplay/history` uses `completedSessions[0]`.
- `/training/team` uses the first low-completion rep.
- `/team` uses first at-risk rep or first rep.
- `/leaderboard` uses `rows[0]`.
- `/notifications` computes an initial selected notification while the client panel maintains independent filter/read state.

Problem:

The UI visually promises a selected row and contextual drawer, but many pages do not support actual row selection. This is the largest UX mismatch against the GoHighLevel-style workspace pattern.

Decision:

Create one shared `OperationalListWorkspace` contract:

- `views`: saved/smart list tabs.
- `filters`: search, sort, status, score, owner, date.
- `rows`: selectable rows with explicit active state.
- `drawer`: selected entity context.
- `actions`: one primary action plus overflow menu.
- `bulkActions`: optional for manager/admin list pages.
- `emptyState`: one next action.

Migrate pages to this pattern instead of continuing to hand-build table + drawer pairs.

### P1: Coaching Is Fragmented Across Too Many Destinations

Current state:

- Saved moments live in `/highlights`.
- Practice lives in `/roleplay`.
- Training lives in `/training`.
- Team progress lives in `/training/team`.
- Rep coaching context lives in `/team/[repId]`.
- Generated roleplay starts inside call detail.

Problem:

These are not separate mental models for managers. They are one coaching loop:

1. Review call evidence.
2. Save or inspect coaching moment.
3. Assign lesson or practice.
4. Track whether the rep improved.

Decision:

Create a visible `Coaching` section with page-local tabs:

- `Moments`
- `Training`
- `Roleplay`
- `Team Progress`

Keep reps on `Training` as their learning surface, but managers should experience coaching as one loop.

### P1: Calls Is Close, But Needs Real Saved Views

Strengths:

- Dense table.
- Mobile cards.
- Filters.
- Upload action.
- Pagination.
- Detail route.
- Processing and failed states.

Problems:

- Saved views are currently hardcoded quick links, not true saved/smart views.
- Score range is buried in a `<details>` section.
- Preview drawer is tied to the first row.
- The page should behave like the primary call review ledger.

Decision:

Ship `Calls` as the canonical list-workspace pattern first. It has the highest leverage because the pattern can then be reused for Today, Highlights, Training Team, Team, Leaderboard, and Notifications.

Recommended saved views:

- `Needs review`
- `Low score`
- `Processing`
- `Failed`
- `My calls`
- `Team calls` for managers

### P1: Component Size Makes a Huge Refactor Risky

Largest current surfaces:

- `components/settings/rubrics-panel.tsx`: 1310 LOC
- `components/training-panel.tsx`: 1266 LOC
- `components/forge.tsx`: 1169 LOC
- `components/call-detail-panel.tsx`: 936 LOC
- `components/roleplay-panel.tsx`: 913 LOC
- `components/settings/teams-panel.tsx`: 894 LOC
- `components/settings/permissions-panel.tsx`: 790 LOC
- `components/team/team-views.tsx`: 741 LOC
- `app/(authenticated)/calls/page.tsx`: 708 LOC
- `app/(authenticated)/dashboard/page.tsx`: 635 LOC

Problem:

These files combine data presentation, interaction state, forms, workflows, drawers, copy, status handling, and feature-specific logic. A broad UI refactor through these files will be fragile unless the shared patterns are extracted first.

Decision:

Refactor by extracting contracts before visual polish:

- `OperationalListWorkspace`
- `OperationalSavedViews`
- `OperationalSelectionDrawer`
- `OperationalBulkActions`
- `OperationalMetricSummary`
- `SettingsRouteConfig`
- feature-specific row/card components

### P1: Admin Belongs Behind a Cleaner Boundary

Strengths:

- People, teams, permissions, integrations, rubrics, compliance, and account are real workflows.
- Settings secondary rail exists.
- Manage/overview split exists for teams, permissions, and rubrics.

Problems:

- Settings route config is duplicated between `settings/page.tsx` and `settings-operational-layout.tsx`.
- Admin tasks compete mentally with sales-manager daily work.
- Admin and settings tasks are different from daily sales coaching work, and should not live as normal top-level modules.

Decision:

Centralize settings route config and expose settings/admin as a footer entry. Opening it should swap into a settings-specific shell with grouped admin links and a clear `Go Back` path to the product workspace. Keep `/settings` route paths for compatibility.

### P2: Global Utilities Need a Clear Home

Current state:

- Topbar mostly holds the mobile nav button and account menu.
- Notifications are inside account menu.
- Feedback and product guide are inside account menu.
- Upload is only page/action based.

Problem:

The utility model is not explicit. GHL splits this cleanly: account switcher/search/quick action live at the top of the left rail, while notifications/help/profile live in the top-right utility area.

Decision:

Use the shell for cross-product utilities:

- left rail top: org/team context, search/command entry, `Upload call`
- top right: notifications icon with unread state, help/product guide, account/profile
- footer: settings/admin

Do not add a heavy global search unless it is wired to real objects.

### P2: Metrics Are Often First, But Decisions Should Be First

Metric strips are consistent and useful, but almost every page leads with metrics. For sales managers, this creates scan fatigue.

Decision:

Use metrics when they change a decision:

- Today: risk counts and queue totals.
- Calls: processing/failed/needs-review counts.
- Coaching: open assignments and stalled reps.
- Team: at-risk reps and trend.
- Admin: setup/connection status.

Remove or demote metrics that are just page decoration.

### P2: Copy Needs Manager/Rep Language

Examples to tighten:

- `Dashboard` -> `Today`
- `Highlights` -> `Moments`
- `Review queue` -> `Needs attention`
- `Open training` -> `Assign training` or `Continue training`, depending role
- `Open team` -> `Review team`
- `Roleplay history` -> `Practice history`
- `Revenue Command` should be validated against product positioning; it sounds broad compared with the coaching product.

## Feature-by-Feature Direction

### Today

Current source: `/dashboard`

Keep:

- Role-aware dashboard data.
- Queue generation.
- setup/readiness context.

Change:

- Make visible page title `Today`.
- Make queue the primary surface.
- Add saved views.
- Make selected item interactive.
- Move metrics into compact summary rail or top summary row.

### Calls

Current source: `/calls`, `/calls/[id]`, `/upload`

Keep:

- Call list filters.
- Upload as primary action.
- Call detail tabs.
- Transcript, moments, summary, notes, and roleplay generation.

Change:

- Make list row selection real.
- Add smart/saved views.
- Move score range into the standard filter bar.
- Make call detail's coaching actions more visible.
- Replace modal-first generated roleplay with a side-panel flow if feasible.
- Treat upload as an action from Today/Calls, not a primary route.

### Coaching

Current source: `/highlights`, `/training`, `/training/team`, `/training/builder`, `/roleplay`, `/roleplay/history`

Keep:

- Highlight evidence library.
- Training learner experience.
- Team progress.
- Curriculum builder.
- Roleplay voice/text practice.
- Generated-from-call roleplay.

Change:

- Make `Moments`, `Training`, `Roleplay`, and `Team Progress` tabs under one Coaching area.
- Link moments to assign/practice actions directly.
- For managers, make assigned training and stalled progress more prominent than course content.
- For reps, keep training and practice focused on "what do I do next?"

### Team

Current source: `/team`, `/team/[repId]`, `/leaderboard`

Keep:

- Roster.
- At-risk rep status.
- Rep profile.
- Leaderboard/rank data.

Change:

- Make risk and next coaching action the primary manager view.
- Treat leaderboard as a tab/view, not always a separate destination.
- Make team drawer selection real.
- Connect rep profile directly to calls, moments, assignments, and practice.

### Notifications

Current source: `/notifications`

Keep:

- Notification grouping.
- Read/unread state.
- Mark one/read-all behavior.

Change:

- Remove duplicated nonfunctional category chips from page header unless wired.
- Tie drawer to actual selected notification, or remove the drawer.
- Consider moving notifications primarily to topbar popover, with full page as secondary.

### Reports

Current source: dashboard metrics, `/leaderboard`, call/team aggregates embedded across feature pages.

Keep:

- Existing call, team, training, and leaderboard data.
- Manager-visible trend and performance signals.

Change:

- Treat reporting as measurement, not work execution.
- Keep `Today`, `Calls`, and `Coaching` action-first.
- Add a manager/admin `Reports` module only when it has enough real content to justify a top-level entry.
- Put report-specific views in horizontal tabs: `Calls`, `Team`, `Training`, `Coaching outcomes`, `Exports`.
- Use date range, team/rep filters, and saved report views close to the charts/tables they affect.
- Avoid duplicating the same metrics at the top of every operational page.

### Admin

Current source: `/settings/*`

Keep:

- Account.
- People.
- Teams.
- Permissions.
- Integrations.
- Rubrics.
- Compliance.
- Overview/manage split for complex admin areas.

Change:

- Centralize settings route config.
- Keep settings/admin in the sidebar footer, not in the primary product module list.
- Use a separate settings/admin shell with a `Go Back` control and grouped settings rail.
- Make overview pages scan-only and management pages editor-first.
- Standardize admin editor drawer pattern across people, teams, permissions, and rubrics.

## Recommended Refactor Phases

### Phase 1: IA and Contract Lock

Outcome: product model is clear before page rewrites.

- Define separate shell maps: standard account shell, settings/admin shell, and future platform/agency shell.
- Rename visible nav labels without changing route paths.
- Centralize route definitions for primary nav and settings/admin.
- Write `OperationalListWorkspace` API and tests.
- Do not migrate every page yet.

### Phase 2: Calls as the Reference Workspace

Outcome: one complete pattern to copy.

- Convert `/calls` to selected-row list workspace.
- Add saved/smart view controls.
- Standardize filters and drawer.
- Keep existing URLs/query params where possible.
- Add tests for selection, filters, and drawer actions.

### Phase 3: Today Work Queue

Outcome: the home route becomes the actual daily operating surface.

- Rename visible page to `Today`.
- Move queue above metrics.
- Add queue views.
- Make queue selection real.
- Align manager/rep/executive copy.

### Phase 4: Coaching Consolidation

Outcome: managers stop bouncing across feature silos.

- Reframe Highlights as `Moments`.
- Put moments/training/roleplay/team progress under Coaching.
- Keep existing route redirects or aliases.
- Make call detail actions feed this loop.

### Phase 5: Team and Admin Cleanup

Outcome: management views are powerful but quieter.

- Convert Team and Leaderboard to shared workspace patterns.
- Decide whether `Reports` gets promoted as a top-level manager/admin module, based on real available reporting surfaces.
- Centralize Admin route config.
- Decompose large settings panels.
- Normalize editor drawers and confirmation flows.

### Phase 6: Visual QA and Browser Pass

Outcome: polish after the model is correct.

- Desktop and mobile screenshots for each authenticated route.
- Keyboard checks for nav, filters, drawers, dialogs, and forms.
- Reduced-motion pass.
- Long text and empty-state pass.
- Run `verify:web` once the refactor settles.

## What "Perfect" Means Here

Perfect does not mean one giant styling pass. It means:

- Every top-level nav item maps to a real job.
- The global sidebar stays flat, literal, and short.
- Complex navigation appears as module-local tabs or saved views.
- Every list with a drawer supports real selection.
- Every page has one primary action.
- Metrics only appear when they change a decision.
- Managers can answer "who needs coaching today?" in under 10 seconds.
- Reps can answer "what do I do next?" in under 10 seconds.
- Admin tasks are discoverable without polluting the daily coaching flow.
- Shared workspace contracts prevent drift after the refactor.

## Initial Implementation Guardrails

- Preserve current route paths during early phases.
- Do not rewrite backend data services unless a UI contract requires it.
- Avoid landing-page composition inside authenticated pages.
- Prefer dense, restrained work surfaces over decorative cards.
- Use the existing Forge tokens and primitives before adding new styling.
- Treat `TrainingPanel`, `RoleplayPanel`, `CallDetailPanel`, and settings panels as decomposition targets, not as places to pile more UI branches.
- Keep tests close to behavior: navigation visibility, filters, selected drawer behavior, role gating, and form/action state.
