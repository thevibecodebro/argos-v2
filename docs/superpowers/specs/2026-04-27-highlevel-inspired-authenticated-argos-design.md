# HighLevel-Inspired Authenticated Argos Design

Date: 2026-04-27

Status: Draft for user review

Branch: `codex/auth-forge-shell-p0`

## Purpose

Redesign the authenticated Argos feature pages so they feel like one serious sales-coaching operating system. The target is not to copy HighLevel visually. The target is to mimic HighLevel's product architecture: persistent module navigation, clear workspace context, settings as a control room, dense ledgers, widget-style dashboards, role-aware admin, and focused configuration panels.

Argos keeps its own forge-style visual direction:

- Dark forge shell, warm ivory text, gold primary accents, ember priority accents, cyan analytical accents.
- Practical sales-coaching density.
- Existing routes, product language, data model, and workflows.
- No invented features, no generic CRM copy, no marketing-heavy authenticated pages.

## HighLevel Research Summary

The useful HighLevel benchmark is structural.

Sources reviewed:

- HighLevel Business Profile Settings: settings is reached from the left navigation; Business Profile is the first settings item and default settings page; settings are grouped into sections such as general information, physical address, business information, authorized representative, global toggles, deduplication, and legacy feature controls.
- HighLevel Custom Menu Links: navigation can be personalized for agency and sub-account users, with sidebar preference, role-based visibility, external links, embedded pages, and reordering.
- HighLevel User Access: agency team management and sub-account team management are separate but related; Settings > Team and Settings > My Staff expose add, edit, delete, role, permission, and account assignment flows.
- HighLevel Subaccount Dashboard: dashboards have widget and no-widget states, view and edit modes, date picker, dashboard selector, action menu, quick filters, filter pills, widgets, and blank dashboard quick starts.
- HighLevel Agency Company Settings: agency/global settings use a central control panel with tabs such as Basic Details, Whitelabel, and Advanced Settings.

Design translation:

- Copy the information architecture and interaction model.
- Do not copy HighLevel's visual skin, generic CRM tone, or feature set.
- Use HighLevel as the benchmark for business-app confidence and Argos as the benchmark for brand, workflow, and data.

## Product Principles

1. Argos is a sales-coaching workspace, not a marketing page after login.
2. Every authenticated page should answer: what changed, what needs review, what should the operator do next?
3. Navigation should make scope obvious: workspace, role, active module, and settings area.
4. Settings should feel like a system control room, not scattered forms.
5. Dense tables and ledgers are appropriate. The polish comes from hierarchy, row affordance, filters, and state design.
6. Side panels should handle create, edit, and configuration flows when possible. Modals are reserved for confirmations and interruptive tasks.
7. Empty states should be quick starts: one useful next action, not marketing copy.
8. Mobile should preserve workflows with stacked cards and drawers, not shrink desktop tables until they break.

## App Shell Design

### Primary Rail

Adopt a HighLevel-like persistent module rail with Argos forge styling.

Groups:

- Review: `/dashboard`, `/calls`, `/highlights`
- Coach: `/training`, `/roleplay`
- People: `/team`, `/leaderboard`
- System: `/notifications`, `/settings`

Rules:

- Show workspace context near the top: organization/team name and current role where available.
- Keep Settings anchored as a system destination, not mixed into coaching pages.
- Use Material Symbols consistently.
- Active state uses full-row warm fill, gold icon/text, and a thin warm border. No side-stripe active indicator.
- Desktop rail stays persistent. Tablet can collapse to a narrow rail. Mobile uses a drawer and top command bar.

### Top Command Strip

The top bar should become an operational strip, not empty chrome.

Contents:

- Current route or breadcrumb label.
- Workspace or role context if not already visible in rail.
- Primary global action where applicable: Upload call.
- Notifications/account entry.
- Page-level date range or quick filter only when the page owns it.

Do not add a command palette unless that feature already exists.

## Settings Control Room

Settings should mimic HighLevel's two-level settings architecture.

Layout:

- Main app rail remains visible.
- Settings area gets a second rail or responsive settings drawer.
- `/settings` becomes the settings overview/default landing page.
- Child settings pages share the same page header, save state, section rhythm, and empty/error/loading states.

Settings groups:

- Workspace: Account, Integrations, Notifications
- People: People, Teams, Permissions
- Coaching system: Rubric, Compliance

Behavior:

- Each settings page starts with a short plain-language purpose statement.
- Forms are grouped into section panels with field labels, helper text, dirty state, save state, and error state.
- Tables use row actions or side panels for edit/create flows.
- Dangerous actions use confirmation, scoped warning copy, and ember/danger state.
- Role visibility should follow existing permissions. Do not invent new permission levels.

## Shared Page Patterns

### Page Header

Every primary route gets a consistent header:

- Eyebrow: compact gold label.
- Title: route-specific title using existing product language.
- Description: one sentence, max 70ch.
- Primary action: only when there is a real action.
- Secondary action or status chip: optional.

Avoid hidden headers on key pages. Hidden headers made the app feel disconnected.

### Dashboard Widgets

Inspired by HighLevel dashboard states, but without inventing a dashboard builder.

Use:

- Date range and quick filters where data already supports it.
- Widget-like panels with title, source, metric, trend, and action.
- Empty quick starts when no data exists.
- Action menu only for existing actions.

Do not add dashboard edit mode, drag and drop, custom dashboard creation, or templates unless they already exist.

### Ledgers

For `/calls`, `/highlights`, and `/notifications`:

- Sticky filter/action bar.
- Search first, filters second, reset affordance last.
- Dense desktop rows with hover affordance.
- Clear status chips using gold, cyan, ember, success, and danger.
- Mobile fallback cards with the same actions and metadata.
- Row action menus for secondary actions when needed.

### Detail Workbench

For `/calls/[id]`:

- Treat the page like a focused operational record.
- Left side: score, coaching moments, rubric categories, next action.
- Right side: transcript, evidence, notes, media state.
- Use generated roleplay as a contextual action tied to a completed call.
- Do not expose implementation details like raw IDs as primary page copy.

### Intake Flow

For `/upload`:

- Treat upload as call intake.
- Show required file input, accepted formats, call metadata, consent/compliance helper, real upload progress, processing state, error state, and next action.
- Progress should clearly separate upload from scoring/processing.

### Practice Workbench

For `/training` and `/roleplay`:

- Keep these serious and measurable.
- Use selector rail or compact scenario/module list.
- Main surface is the active lesson or active simulation.
- History, scoring, and progress sit below or beside the active work, not above it.
- Generated-from-call states use source chips and preserve current product language.

### People System

For `/team`, `/team/[repId]`, `/settings/people`, `/settings/teams`, and `/settings/permissions`:

- Keep performance and administration distinct.
- `/team` is roster and coaching performance.
- `/team/[repId]` is rep coaching profile.
- Settings People/Teams/Permissions own user access, role scope, and admin changes.
- Admin edit/create flows should use side panels where feasible.

## Page-by-Page Direction

### `/dashboard`

Priority: P1

HighLevel pattern: dashboard widgets, date range, filter pills, quick starts.

Argos direction:

- Convert to an operating pulse: call ingest, scoring health, coaching flags, training progress, roleplay activity.
- Use widget-like panels with compact metrics and next action.
- Preserve role-aware manager/executive/rep logic.
- Empty state should point to Upload call or setup steps.

### `/calls`

Priority: P1

HighLevel pattern: dense ledger with quick filters and row actions.

Argos direction:

- Keep the call library table.
- Make filter/action bar sticky and compact.
- Add mobile card fallback.
- Use cyan for scores/processing, ember for failed/needs attention, gold for active filters.

### `/calls/[id]`

Priority: P1

HighLevel pattern: detailed CRM record with evidence, activity, and actions.

Argos direction:

- Redesign as the review bench.
- Connect scorecard, transcript, highlights, notes, and roleplay generation.
- Make score feel calibrated and analytical, not decorative.
- Prioritize evidence and next coaching action.

### `/highlights`

Priority: P1

HighLevel pattern: filtered list/library.

Argos direction:

- Replace decorative card treatment with a coaching highlight ledger.
- Add compact summary widgets above list.
- Group or filter by category/severity if existing data supports it.
- Empty state links to Calls.

### `/upload`

Priority: P1

HighLevel pattern: setup page with required inputs and clear save/progress states.

Argos direction:

- Redesign as call intake.
- Strong dropzone, metadata field, compliance helper, upload phase, processing phase, error state.
- Completed state should route to the reviewed call.

### `/roleplay`

Priority: P1

HighLevel pattern: module workspace with selector, active pane, and history.

Argos direction:

- Reframe as simulation bay.
- Scenario selector replaces generic persona card grid.
- Active practice surface owns transcript, mic/text controls, score, and end state.
- History becomes a compact lower ledger.

### `/training`

Priority: P2

HighLevel pattern: module workspace and setup controls.

Argos direction:

- Keep learner-first course shell.
- Use forge workbench surfaces for module stage, curriculum map, manager controls, and overlays.
- Gold marks current module. Cyan marks progress and scoring.

### `/team`

Priority: P2

HighLevel pattern: people roster, but adapted as performance not admin.

Argos direction:

- Keep the roster/performance purpose.
- Tighten overview copy and make performance rows denser.
- Keep admin user/team management in Settings.

### `/team/[repId]`

Priority: P2

HighLevel pattern: detail record.

Argos direction:

- Rep identity header with current score, trend, focus areas, and actions.
- Connect recent calls, coaching focus, and badges into one coaching profile.

### `/leaderboard`

Priority: P2

HighLevel pattern: reporting table/widget.

Argos direction:

- Replace equal generic cards with rank ledgers.
- Use gold for rank, cyan for performance metrics, ember for notable movement.

### `/notifications`

Priority: P2

HighLevel pattern: activity inbox.

Argos direction:

- Compact feed grouped by date.
- Category icon, unread dot, timestamp, and linked row action.
- Empty state explains which Argos events generate notifications.

### `/settings`

Priority: P1

HighLevel pattern: default settings landing page.

Argos direction:

- Settings overview with grouped sections and status summaries.
- Show Workspace, People, and Coaching system groups.
- Each card routes to its existing settings child page.

### `/settings/people`

Priority: P1

HighLevel pattern: My Staff / User Access.

Argos direction:

- User table with role, team, status, last active/invite status if available.
- Add/edit user via side panel or existing workflow.
- Show least-privilege helper copy.

### `/settings/teams`

Priority: P1

HighLevel pattern: team management under Settings.

Argos direction:

- Teams table or list with manager, members, assignment state, and row actions.
- Create/edit team in side panel if supported by existing workflow.
- Make clear this is admin configuration, while `/team` is performance.

### `/settings/permissions`

Priority: P1

HighLevel pattern: role and permission scopes.

Argos direction:

- Permission matrix or grouped permission panels.
- Keep existing role model.
- Explain scope plainly without adding new roles.

### `/settings/compliance`

Priority: P1

HighLevel pattern: global behavior and compliance toggles.

Argos direction:

- Sectioned compliance settings with status, helper text, and test/save actions where existing behavior supports it.
- Ember for risky or incomplete configuration.

### `/settings/integrations`

Priority: P1

HighLevel pattern: connected app settings.

Argos direction:

- Connected/disconnected cards or rows.
- Show provider, status, last sync/error where available, and connect/manage action.
- Do not invent integrations.

### `/settings/rubric`

Priority: P1

HighLevel pattern: system setup module.

Argos direction:

- Rubric setup as a coaching system control panel.
- Category list, weights, scoring state, publish/save action, and empty quick start.
- Preserve existing rubric data model.

## Responsive Behavior

Desktop:

- Persistent primary rail.
- Settings second rail on settings pages.
- Tables and ledgers use dense rows.
- Detail workbenches use two-column layout.

Tablet:

- Primary rail can collapse or become narrower.
- Settings rail can collapse into a sticky tab bar or drawer.
- Workbenches become single primary column plus collapsible secondary panels.

Mobile:

- Drawer navigation.
- Page header remains visible.
- Tables become cards.
- Action bars wrap and stay near top.
- Side panels become full-screen sheets.

## Accessibility and State Requirements

All reusable patterns need:

- Keyboard focus states using gold focus ring.
- Hover, active, disabled, loading, error, empty, and success states.
- `prefers-reduced-motion` support.
- No text overlap at mobile widths.
- Touch targets at least 40px where feasible.
- Skeletons that match real layout shapes.
- No spinner-only loading state on major pages.

## Visual Rules

- Use forge palette tokens from the homepage direction.
- Use Material Symbols consistently.
- Use warm ivory low-opacity borders, not bright blue outlines.
- Avoid side-stripe accents.
- Avoid nested card piles.
- Avoid hero-like marketing sections inside authenticated pages.
- Use compact labels and tabular numbers for metrics.
- Use cyan for analytics, gold for primary/focus, ember for priority/heat.

## Non-Goals

- Do not add custom dashboard builder/edit mode.
- Do not add custom menu link management.
- Do not add new roles or permission scopes.
- Do not add new integrations.
- Do not rewrite product language.
- Do not change routes, data services, auth, or core workflows for visual reasons.
- Do not make Argos look like HighLevel's default CRM UI.

## Implementation Sequence

1. P0 Shell and shared patterns
   - App rail, top command strip, page header, action bar, table shell, empty states, skeletons, modal/side-panel styling, settings rail.

2. P1 Core operating pages
   - `/dashboard`, `/calls`, `/calls/[id]`, `/highlights`, `/upload`.

3. P1 Settings control room
   - `/settings`, `/settings/people`, `/settings/teams`, `/settings/permissions`, `/settings/compliance`, `/settings/integrations`, `/settings/rubric`.

4. P1/P2 Coaching pages
   - `/roleplay`, `/training`.

5. P2 People and performance polish
   - `/team`, `/team/[repId]`, `/leaderboard`, `/notifications`.

6. Final hardening
   - Responsive pass, keyboard pass, loading/empty/error pass, visual regression screenshots, typecheck, build, and web tests.

## Verification Plan

Before calling implementation complete:

- Run `npm run typecheck:web`.
- Run `npm run build -w @argos-v2/web`.
- Run `npm run test:web`.
- Run `git diff --check`.
- Verify representative desktop and mobile screenshots for:
  - `/dashboard`
  - `/calls`
  - `/calls/[id]`
  - `/upload`
  - `/roleplay`
  - `/training`
  - `/team`
  - `/settings`
  - `/settings/people`
  - `/settings/rubric`

## Open Decision

Approved direction from user: mimic HighLevel's information architecture and settings/dashboard patterns while keeping Argos visually dark, forge-like, and premium.

Before implementation planning, user should review this spec and confirm:

- The HighLevel benchmark is structural, not visual.
- Settings control room should be a first-class redesign priority.
- The app-wide route mapping is acceptable.
