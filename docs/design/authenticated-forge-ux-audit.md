# Argos Authenticated Forge UX Audit

Date: 2026-04-27

Scope: `/dashboard`, `/calls`, `/calls/[id]`, `/highlights`, `/upload`, `/roleplay`, `/training`, `/team`, `/team/[repId]`, `/leaderboard`, `/notifications`, `/settings`, `/settings/people`, `/settings/teams`, `/settings/permissions`, `/settings/compliance`, `/settings/integrations`, `/settings/rubric`.

Target direction: make the authenticated workspace feel like the same product as the new forge-style homepage: dark, executive, cinematic, precise, operational. Preserve current routes, product language, data model, and workflows.

Current evidence:

- `apps/web/app/globals.css` still defines shell and landing tokens around the old blue/cyan command-center palette: `#0b0e14`, `#10131a`, `#74b1ff`, `#6dddff`.
- `apps/web/components/app-shell.tsx` hard-codes the old blue navigation, top bar, active states, and ambient glow.
- `apps/web/components/page-frame.tsx` hard-codes page headers, actions, shadows, and accents around the same blue vocabulary.
- Several feature pages use custom body treatments, so the app has multiple competing visual languages: old shell blue, calls dark glass, team double-panel, training stacked module shell, settings utility cards.

## Executive Diagnosis

The app is usable, but it does not yet feel like one premium product. The root problem is not any single page. It is that the authenticated app has no shared forge design system beneath it. The shell, header, buttons, panels, tables, filters, empty states, and settings navigation are all restyled locally.

The old product mood is "blue command center." The requested product mood is "forge command workspace." That change should happen through tokens, surfaces, hierarchy, and state design, not by making feature pages cinematic landing pages.

Priorities:

- P0: Shell-wide fixes that change every page and reduce future drift.
- P1: Major page redesigns where the workflow is important and the current surface feels clunky or mismatched.
- P2: Polish where the page is already structurally sound but needs token, spacing, and state cleanup.

## Shared Design System Proposal

### 1. App Scene

Scene sentence: An SMB sales operator is reviewing calls on a wide desktop monitor between coaching meetings. The room is dim, the work is time-sensitive, and the UI should feel like a precise bench for listening, scoring, assigning training, and launching practice.

Use a dark product register, not a marketing register. Keep motion short, purposeful, and reduced-motion safe.

### 2. Core Tokens

Use CSS variables or Tailwind theme tokens so page code stops repeating hex values.

- `--forge-bg`: `#050403`
- `--forge-depth`: `#0d0907`
- `--forge-surface`: `#100907`
- `--forge-surface-2`: `#17100c`
- `--forge-surface-3`: `#20150f`
- `--forge-text`: `#fff4e6`
- `--forge-muted`: `rgba(255, 244, 230, 0.68)`
- `--forge-faint`: `rgba(255, 244, 230, 0.42)`
- `--forge-border`: `rgba(255, 244, 230, 0.10)`
- `--forge-border-strong`: `rgba(255, 244, 230, 0.18)`
- `--forge-gold`: `#f1bf7b`
- `--forge-ember`: `#ff9f5f`
- `--forge-cyan`: `#88daf7`
- `--forge-danger`: `#ff716c`
- `--forge-success`: `#8bd7a8`
- `--forge-warning`: `#f1bf7b`

Usage rules:

- Gold: section labels, focus rings, primary actions, active nav.
- Ember: priority, urgent workflow state, destructive confirmation warnings when not error.
- Cyan: metrics, processing, score analytics, operational status.
- Success/danger: semantic states only.
- No bright blue outer glows. Use thin warm borders and subtle inner highlights.

### 3. Typography

Use `Space Grotesk` for navigation, labels, tabs, compact UI, and controls. Keep body copy readable with the existing body face unless a full font decision is made. Avoid display-serif inside authenticated product UI except maybe a single executive summary title on `/dashboard`, and only if it does not spread to labels or tables.

Rules:

- Labels: 10 to 11px uppercase, 0.18 to 0.24em tracking.
- Page titles: 28 to 36px desktop, 24 to 28px mobile.
- Panel titles: 16 to 20px.
- Table body: 13 to 14px.
- Numbers: use tabular figures, and use a mono or `font-variant-numeric: tabular-nums`.

### 4. App Shell

First implementation target.

Problems in current shell:

- `app-shell.tsx` sets a fixed 240px sidebar and fixed top bar with no mobile collapse.
- Active nav uses a right border stripe, which conflicts with the requested disciplined panel language and the Impeccable ban on side-stripe accents.
- The top bar is mostly empty, so it feels like chrome rather than a command layer.
- Upload and notifications are blue utility pills, not part of a forge workspace.

Direction:

- Left rail becomes a forge nav: `#050403` base, smoked surface groups, warm border, gold active indicator using full-row fill and icon/text color, not a side stripe.
- Use Material Symbols only. Tune size and weight consistently through `font-variation-settings`.
- Group labels stay compact: Calls, Coaching, People, System.
- Top bar becomes a utility command strip with org name, current area breadcrumb, upload, notifications, and account.
- Desktop: fixed left rail remains efficient.
- Tablet: collapsible rail to icons plus text on hover or a persistent narrow rail.
- Mobile: drawer nav with top command bar, no horizontal overflow.

### 5. Page Header

Replace mixed headers and hidden `PageFrame` usage with one reusable `ForgePageHeader`.

Pattern:

- Eyebrow: gold, compact, operational.
- Title: warm ivory.
- Description: muted ivory, max 70ch.
- Primary action: gold filled or gold-on-dark depending importance.
- Secondary action: warm border.
- Optional status chip: cyan, ember, success, or warning.

Use this even when the visual header is compact. Avoid hiding headers entirely on key pages because it makes pages feel disconnected.

### 6. Forge Surfaces

Standardize panels into "forge surfaces":

- Radius: 20 to 28px for main panels, 14 to 18px for controls.
- Border: `1px solid var(--forge-border)`.
- Background: smoked charcoal with subtle warm top light:
  `linear-gradient(180deg, rgba(23,16,12,0.96), rgba(13,9,7,0.98))`.
- Inner highlight: `inset 0 1px 0 rgba(255,244,230,0.06)`.
- Shadow: deep brown/black only, low contrast.
- No nested card piles. Use section dividers, table rows, and grouped fields where possible.

### 7. Data Components

Metric tiles:

- Compact, not giant.
- Use cyan for numeric analytics, gold for business goals, ember for urgent changes.
- Use tabular numbers.
- Add explanatory context below only when it changes action.

Tables:

- Sticky/filter area at the top of list pages.
- Row hover should reveal affordance with warm surface lift and right action icon.
- Keep row density, but improve contrast and row grouping.
- Desktop table, mobile fallback cards.
- No backdrop blur inside scrolling containers.

Filters:

- Search as the first control.
- Filters sit in one action bar, not scattered cards.
- Active filters use gold/cyan chips and a clear "Reset" affordance.

Empty states:

- State what is missing and the next useful action.
- Do not sound like marketing.
- One primary action maximum.

Modals:

- Keep focused overlays only for real interruption workflows: roleplay generation, training authoring, assignment, rubric publish confirmation.
- Use focus trap and escape handling consistently.
- Modal surface follows forge panel tokens.

Loading:

- Keep existing skeleton structure, recolor to warm ivory alpha and smoked surfaces.
- Avoid spinners.
- Use page-specific skeletons for team and call detail.

## Page-by-Page Audit

### `/dashboard` - P1

Problem: The dashboard has useful role-aware content, but it is visually the most generic part of the app. Metrics are identical blue cards, the "Live team snapshot" CTA card feels like a SaaS hero, and manager/executive sections rely on repeated boxes rather than a clear operational flow.

Direction: Make it the executive forge bench. Top row should combine one compact "operating pulse" panel with metrics, setup status, and alerts. Replace equal-card repetition with grouped status bands: Call Ingest, Scoring Health, Coaching Flags, Training Progress, Roleplay Activity. Keep role-specific logic intact.

Concept: "Today in the forge": left side live activity and score trend, right side priority queue and setup health, below that team/rep performance tables.

### `/calls` - P1

Problem: Structurally strong, but it is wrapped in a large blue glass container and filter controls use blur on scrolling/list surfaces. The table density is good, yet the page feels closer to the old command-center homepage than the new forge palette.

Direction: Keep the table workflow. Recolor to forge surfaces, make the filter/action bar sticky inside the page, convert active states to gold/cyan, remove glass blur from non-fixed content, and add mobile cards. Keep call row affordance and direct row click.

Concept: "Call intake ledger": a dense warm table with cyan score bars, ember failed/processing status, and gold active filters.

### `/calls/[id]` - P1

Problem: This is the highest-value workflow, but it feels like several separate apps: scorecard, media preview, transcript, moments, roleplay generation, summary, and notes all compete. Some labels expose implementation detail, for example `#id` and viewer metadata in the header. The fake media/player preview can look decorative if no media is linked.

Direction: Treat it as the product's core forge surface. Use a two-zone layout: left score and coaching moments, right transcript and evidence. The scorecard should feel like a calibrated gauge, not a blue neon ring. Transcript lines need stronger connection to moments and highlights. "Generate Roleplay" should be a contextual gold action when the call is complete.

Concept: "Review bench": score gauge, rubric categories, key moments, transcript, coaching notes, and roleplay generation in one coherent evidence flow.

### `/highlights` - P1

Problem: This page is visually outdated. It uses alternating blue/cyan left borders, inline backdrop blur, and an end-of-list state that can imply more items are coming even when the user simply reached the end. The bento cards at the bottom feel disconnected from the list.

Direction: Replace left border stripes with full-row forge surfaces and severity chips. Move aggregate insight panels to the top as compact analytics, then show the highlight ledger. Empty state should say how highlights are created from call detail and offer "Open call library."

Concept: "Coaching library": searchable highlight rows grouped by category or severity, with small cyan/gold metrics above.

### `/upload` - P1

Problem: The workflow is correct and has honest upload progress, but the visual design is plain and still blue. The dropzone lacks the forge sense of intake, consent/compliance context is not visually prominent here, and the processing phase could be clearer.

Direction: Turn it into a "call intake" surface: large but restrained dropzone, visible accepted formats/limit, call name field, consent/status helper, progress with two phases: Uploading and Scoring. Keep real byte progress. Use ember for errors, cyan for processing, gold for focus/CTA.

Concept: "Call intake forge": file enters, gets normalized, scored, then opens the detail page.

### `/roleplay` - P1

Problem: The feature is powerful, but the UI looks playful compared with the desired serious sales-coaching workspace. Persona cards are a generic grid, chat bubbles feel consumer-like, the pro tip is generic, and the history table is visually separate from the active practice surface.

Direction: Reframe as a simulation bay. Persona selection becomes a compact scenario selector, not a card gallery. Active session gets the primary surface: transcript, mic/text controls, and scorecard. History becomes a lower ledger. Generated-from-call state should use a gold/cyan source chip and preserve the current product language.

Concept: "Simulation bay": choose scenario, run live voice/text practice, end and score, review history.

### `/training` - P2

Problem: The recent structure is better than older training surfaces, and it correctly preserves learner-first flow. It still inherits blue radial hero styling and separate panel treatments. The manager deck copy is helpful but could be visually calmer and more compact.

Direction: Keep the stacked learner-first course shell. Convert module stage, curriculum map, and manager deck to forge surfaces. Give the module stage a serious lesson/rubric feel, with gold for current module and cyan for progress. Keep manager authoring in overlays.

Concept: "Curriculum bench": one main lesson surface, compact module map, manager planning surface below.

### `/team` - P2

Problem: This is one of the stronger pages. It already has better responsive table/card behavior and a more premium panel model. The main mismatch is blue atmosphere and verbose hero copy inside a work page.

Direction: Preserve the roster table and mobile cards. Recolor to forge tokens, shorten the roster overview copy, use cyan for performance metrics, ember for coaching flags, and gold for active navigation/action. Reduce decorative blur.

Concept: "Team roster": quick team pulse, then scan-and-drill rep table.

### `/team/[repId]` - P2

Problem: Structure is solid and useful. It inherits the same blue team visual language and still uses generic page header copy. Rep details are scannable but could better connect calls, focus areas, trend, and badges into a coaching narrative.

Direction: Keep all panels and data. Create a compact rep identity header with current status, score, trend, and primary actions. Recolor charts and chips. Make recent calls and focus areas feel like one coaching plan.

Concept: "Rep coaching profile": score, trend, focus, evidence, badges.

### `/leaderboard` - P2

Problem: The three equal cards are simple but feel generic. It repeats the dashboard leaderboard rather than feeling like a dedicated performance view.

Direction: Keep the three categories, but use a rank-table pattern with denser rows, rank badges, and clear metric labels. Add compact tabs or segmented control if categories need focus on smaller screens. Use cyan for score/volume metrics, gold for rank, ember only for notable movement.

Concept: "Performance ranks": three rank ledgers under one shared header.

### `/notifications` - P2

Problem: The feed is useful but plain. It has weak prioritization, no icon/category vocabulary, and the unread state relies on blue fill.

Direction: Use a compact inbox pattern with category icon, unread dot, timestamp, and linked action row. Group by date as it already does. Use gold unread/focus, cyan system/activity, ember priority. Empty state should say which product events create notifications.

Concept: "Activity inbox": score, coaching, training, and account events.

### `/settings` - P1

Problem: The settings shell adds a second fixed left nav inside the main fixed shell. It works on desktop but feels cramped and is not mobile-ready. The account cards are clean but plain and blue.

Direction: Redesign settings as a compact system workspace. Keep the secondary navigation, but turn it into a settings rail with forge active states and responsive collapse. Add a settings page header once at the layout level instead of repeated hidden headers.

Concept: "System settings": secondary rail, active panel, compact forms.

### `/settings/people` - P1

Problem: Important admin flows are all present, but the page feels form-heavy. Members, role edits, removal confirmation, invites, team picker, and pending invites all use similar card styling, so risk levels are hard to scan.

Direction: Make members a dense table on desktop with inline role staging and apply actions. Keep mobile cards. Separate invites into an action drawer or inline expandable panel. Use amber/ember for destructive confirmation and pending invite states.

Concept: "People operations": members ledger plus invite composer.

### `/settings/teams` - P1

Problem: This page is overloaded. Team metadata editing, create team, manager membership, rep membership, status editing, and explanatory copy all appear together in repeated nested cards. It is useful, but visually heavy and hard to scan.

Direction: Split each team into a summary row with expandable details or tabs: Details, Managers, Reps. Keep current APIs and workflows. Create team should be a compact action bar at the top, not a large nested card.

Concept: "Team builder": team list with inline membership management when expanded.

### `/settings/permissions` - P1

Problem: The permission model is complex and the UI exposes that complexity. Presets, team assignments, and primary manager assignment are three different mental models stacked vertically.

Direction: Introduce a clearer hierarchy: top summary of preset vocabulary, then team manager permissions, then primary manager assignments. Use table/list rows rather than large repeated cards. Show current state and staged change side by side.

Concept: "Access matrix": preset definitions, team grants, primary manager map.

### `/settings/compliance` - P2

Problem: The page is clear, but it uses generic warning/confirmation surfaces and one checkmark symbol instead of Material Symbols. It should feel more serious and operational.

Direction: Use formal compliance surfaces with status band, policy acknowledgment record, and auto-ingest dependency state. Use Material Symbols for status. Gold/ember for legal attention, success for acknowledged, muted when inactive.

Concept: "Compliance gate": acknowledgment state controls auto-ingest readiness.

### `/settings/integrations` - P2

Problem: Zoom and GoHighLevel cards are straightforward, but generic. Status, availability, connect/disconnect, and environment configuration should be more legible.

Direction: Use integration rows or compact panels with icon, status, connected metadata, and action. Distinguish unavailable environment config from disconnected account state. Use cyan for connected operational signal, ember for unavailable config.

Concept: "Connection rack": each integration has status, metadata, and one action.

### `/settings/rubric` - P1

Problem: This is a major workflow and currently behaves like a long form wizard inside repeated cards. It is dense, useful, and accurate, but not visually guided enough. Categories in the edit step are very heavy, and the source/edit/review/publish steps need stronger state design.

Direction: Preserve the immutable versioning workflow. Redesign as a forge wizard: left step rail, right active editor, bottom review/publish action bar. Category editor should use expandable sections and validation markers. Active rubric and version history should be compact but always visible.

Concept: "Scorecard forge": active rubric, draft source, category editing, validation, publish.

## Reusable Pattern Priorities

P0 reusable work:

1. Authenticated app tokens in `globals.css` or a new token helper.
2. `AuthenticatedAppShell` forge navigation and top utility bar.
3. `ForgePageHeader` replacing ad hoc and hidden `PageFrame` usage.
4. `ForgeSurface`, `ForgeButton`, `ForgeChip`, `ForgeMetric`, `ForgeEmptyState`.
5. Table/list system with desktop table and mobile card fallback.
6. Settings layout rail and active-page structure.
7. Loading and empty state palette pass.

P1 page work:

1. `/dashboard`
2. `/calls`
3. `/calls/[id]`
4. `/roleplay`
5. `/settings/rubric`
6. `/settings/teams`
7. `/settings/permissions`
8. `/settings/people`
9. `/upload`
10. `/highlights`

P2 page work:

1. `/training`
2. `/team`
3. `/team/[repId]`
4. `/leaderboard`
5. `/notifications`
6. `/settings`
7. `/settings/compliance`
8. `/settings/integrations`

## Implementation Plan

### Phase 1: Shell and Tokens

- Add forge authenticated tokens.
- Update `AuthenticatedAppShell` with forge rail, active states, top utility bar, responsive behavior.
- Replace active side-stripe nav with full-row active treatment.
- Keep Material Symbols, but standardize size and fill/weight.
- Update `PageFrame` or create `ForgePageHeader` and migrate the high-traffic pages first.

Acceptance:

- No authenticated page still depends on `#74b1ff` for primary action, active state, or focus state.
- Sidebar and top bar look like the forge product on desktop and do not break tablet/mobile.

### Phase 2: Shared Components

- Create shared forge primitives for surfaces, buttons, chips, metrics, empty states, table wrappers, and field controls.
- Replace repeated local utility strings in dashboard, settings, notifications, upload, and leaderboard.
- Standardize semantic states.

Acceptance:

- Empty states are consistent and actionable.
- Loading skeletons use warm alpha surfaces.
- Forms have consistent label, helper, error, and focus behavior.

### Phase 3: High-Value Workflow Pages

- Redesign `/training` as a courses workspace: learner course player for reps, course builder for managers.
- Redesign `/settings/rubric` as the scorecard forge: source/version rail, compact category editor, readiness/publish panel.
- Redesign `/calls` and `/calls/[id]` as the call intake and review bench.
- Redesign `/dashboard` as the role-aware operating pulse.
- Redesign `/roleplay` as the simulation bay.

Acceptance:

- These pages preserve all current data and actions.
- No marketing hero treatment on authenticated pages.
- Tables remain dense and scannable.

### Phase 4: Admin Settings Compression

- Redesign settings rail.
- Convert People, Teams, Permissions into denser ledgers with inline staged actions.
- Keep all current confirmation and permission safety.

Acceptance:

- Admin pages have less nested card weight.
- Risky actions have clear staged confirmation.
- Mobile falls back to cards or stacked rows without horizontal scroll.

### Phase 5: Polish and Responsive Audit

- Recolor Team, Rep Profile, Training, Leaderboard, Notifications, Compliance, Integrations.
- Remove decorative blur from scrolling panels.
- Verify focus states and reduced-motion behavior.
- Run browser checks for desktop, tablet, and mobile.

Acceptance:

- Pages feel like one product.
- Utility and density are preserved.
- The homepage inspires the atmosphere, but authenticated pages remain tools.

## Comparable Page Mapping

- `/training`: course player for reps and course builder for managers, with structure rail, selected lesson/module workspace, and persistent action/readiness controls.
- `/settings/rubric`: scoring-system builder with source/version rail, dense category editor, and publish readiness panel.
- `/calls`: call ledger for intake, filtering, review status, and bulk scanning.
- `/calls/[id]`: review workbench with score, evidence, transcript, and coaching actions in one bench.
- `/team`, `/settings/people`, `/settings/teams`, `/settings/permissions`: management tables with dense rows, inline state, and staged admin actions.
- `/settings/integrations`: connected-app settings with provider status, setup controls, and troubleshooting state.
- `/roleplay`: simulation workspace with scenario context, live practice surface, scoring, and session history.

## Highest-Priority Screen Concepts

### App Shell

Left rail in forge black with grouped navigation. Active page uses a smoked full-row fill, gold icon/text, and a subtle inner highlight. Top bar shows current section breadcrumb, org/workspace status, Upload Call, notifications, and account.

### Dashboard

One compact page header. First row: Operating Pulse and Setup Health. Second row: role-specific score metrics and coaching flags. Third row: tables for recent calls, rep performance, and leaderboard slices. Metrics use cyan, urgent coaching signals use ember.

### Calls Library

Sticky action/filter bar, then dense call ledger. Rows use Material status icons, cyan score bars, ember failure/processing indicators, warm hover lift, and mobile cards. Empty state: "No calls yet. Upload a call to start scoring."

### Call Detail

Two-column review bench. Left: score gauge, rubric categories, key moments. Right: media/transcript evidence, generated roleplay action, coaching notes. Highlights are inline states on moments, not separate visual decorations.

### Training

Reps see a course-player workspace: sticky curriculum rail, main lesson/quiz player, progress band, and completion CTA near the lesson. Managers see a course-builder workspace: sticky module tree, selected-module editor preview, and right command panel for create, edit, assign, and AI draft actions.

### Roleplay

Compact scenario selector across the top. Active simulation dominates the page with transcript, voice/text controls, and scorecard. History table below. Generated-from-call sessions get a source chip, not a separate visual language.

### Settings

Forge settings rail with Account, People, Teams, Permissions, Integrations, Rubrics, Compliance. Main panel uses ledgers and grouped fieldsets, not large repeated cards. Rubrics use a source/version rail, compact scoring rows, and persistent readiness/publish controls.
