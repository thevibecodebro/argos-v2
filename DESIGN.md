# Argos Authenticated Design System

Status: source of truth for authenticated product UI readability.

This file supersedes Forge-command aesthetic direction for authenticated pages. Existing `Forge*` component names may remain while the visual behavior becomes neutral, readable product UI.

## Design Goal

Argos should feel like a calm operational SaaS tool for sales managers and reps. The UI should make the primary work object obvious: a queue, table, transcript, form, or practice session.

Scene sentence: A sales manager is reviewing calls and coaching risk between meetings on a laptop or desktop monitor. They need to scan, decide, and move to the next action without reading decorative dashboard chrome.

## Core Principles

1. One page, one primary job.
2. One primary object per page.
3. One primary action per page surface.
4. Support context is subordinate to the work object.
5. Metrics appear only when they shorten a decision.
6. Tables and rows beat card grids for operational data.
7. Cards are for repeated items, empty states, modals, and framed tools only.
8. No nested cards.
9. No marketing hero treatment inside authenticated routes.
10. Navigation stays tenant-scoped; platform controls stay out.

## Visual Language

Use a restrained dark product theme, not a theatrical command theme.

- Background: `#0c0b0a`
- Depth: `#11100e`
- Surface: `#151310`
- Surface 2: `#1b1814`
- Surface 3: `#231f19`
- Text: `#f4efe7`
- Muted text: `rgba(244, 239, 231, 0.70)`
- Faint text: `rgba(244, 239, 231, 0.45)`
- Border: `rgba(244, 239, 231, 0.11)`
- Strong border: `rgba(244, 239, 231, 0.18)`
- Accent gold: `#d8aa68`
- Warning ember: `#d98c58`
- Info cyan: `#7fb8c7`
- Success: `#8bc79d`
- Danger: `#e06d64`

Color usage:

- Gold: primary action, active route, selected row, key focus state.
- Cyan: informational status and processing.
- Ember: warning and attention.
- Green: success and complete.
- Red: destructive and failure.
- Muted neutrals: everything else.

Avoid decorative gradients, grid textures, bokeh, large background effects, and glow-heavy panels.

## Typography

- Use Geist as the single practical sans family for authenticated UI.
- `--font-display` and `--font-body` are compatibility aliases for `--font-ui`, not separate visual voices.
- Page title: 20 to 24px, 600 weight.
- Section title: 16 to 18px, 600 weight.
- Body/table text: 13 to 14px.
- Labels: 11 to 12px, medium or semibold.
- Avoid negative letter spacing.
- Use uppercase labels sparingly for table headers and short metadata only.
- Use tabular numbers for scores, ranks, counts, and durations.

## Layout Contract

Default authenticated page order:

1. App shell
2. Compact page header or toolbar
3. Optional controls row
4. Primary work object
5. Optional right drawer when it helps a selected object
6. Secondary/supporting sections below the fold

The first viewport should not show a page header card, a metric strip, a tabs row, a filters row, a table, and a drawer unless each layer is essential to the decision.

## Component Contract

### App Shell

- Left navigation contains primary tenant routes only.
- Settings is pinned to the system/footer area.
- Notifications and account actions live in the top/account area.
- Labels use normal product text, not heavy uppercase display styling.
- Active state is a calm full-row state, not a colored stripe or glow.

### Page Header

- Compact, unframed or lightly separated.
- One title.
- One sentence max.
- One primary action and at most one secondary action.
- No hero composition.
- No broad feature explanation.

### Toolbar And Controls

- Controls stay close to the table/list/form they affect.
- Search is first when search exists.
- Filters collapse when they are not the primary task.
- Saved views must be real route/filter state, not inert pills.

### Metric Strip

Use only when it changes what the user does next.

Remove it when:

- It repeats table counts.
- It describes a process step.
- The page is a focused form.
- The page is an inbox.
- The page is already a detail view with the same values visible.

### Tables And Lists

Default columns:

- Primary object
- Owner or status
- One performance metric
- Date or state
- Action

Avoid seven or more columns unless the page is explicitly a comparison table. Mobile tables become dense row cards.

### Preview Drawer

The drawer is supporting context, not a second page.

Use for:

- Selected row summary
- Readiness/status
- Next action
- Small metadata

Do not use for:

- Duplicated metrics
- Another navigation rail
- Multi-step forms
- Large prose blocks

### Settings

Settings pages should feel like configuration workspaces:

- Secondary settings rail is allowed.
- Main surface is a dense table, matrix, or form.
- Status drawer is optional.
- Builder flows should be inline expandable sections, drawers, or modals, not stacked cards.

## Route Shape

- Dashboard: queue-first "needs attention" view. Metrics are secondary.
- Calls: table-first review workspace. Upload is the primary action.
- Call detail: transcript/evidence-first workbench. Coaching actions are contextual.
- Highlights: coaching evidence table. Source call is the primary action.
- Upload: single upload form. Remove process metric strips.
- Roleplay: active simulation first. Persona selection supports the session.
- Training: learner lesson first, manager tools behind contextual actions.
- Team: roster/risk table first. Drawer summarizes selected rep.
- Rep profile: identity, score, trend, evidence, coaching plan.
- Leaderboard: rank table. Metrics only if they clarify ranking.
- Notifications: inbox list. Remove metric strip by default.
- Settings: configuration rail plus dense active panel.

## QA Contract

Every major authenticated UI pass needs:

- Focused render tests for structure and forbidden stale copy.
- Typecheck.
- `git diff --check`.
- Desktop and mobile screenshots before claiming visual completion.
- A first-viewport scan for duplicate chrome, nested cards, long text, and fake controls.
