---
name: Argos Operational
source: Google Stitch
stitch_project_id: "7663541137437451553"
stitch_project_title: Argos Authenticated Simplicity Pass
updated: "2026-05-06"
canonical_screens:
  dashboard: "10209ddfa975452484694846cdc0bf8d"
  calls: "fb2bafea181347aeafcd78834642e157"
  highlights: "11628157aac84cb989069d3a83080bcc"
  training: "f746d1793b7544be8b217ecfa7425a62"
  roleplay: "da19f141a5d047388395c45b0fd0c2ff"
  team: "3092d075c7394b4398874de12307c037"
  leaderboard: "b7757c2fce4d44d18f026903c8835700"
  settings: "7d923e8bf6b44a2385c5266b44c26fed"
  notifications: "25444f8dc097422095974481a19f3eda"
  call_detail: "c44391917bab4cee8b908d970525a914"
  upload: "c712654ce4bd452098d49c8dbc323f5e"
  rep_profile: "3fc9d2c449dc49cb855a18e85ba985ec"
  settings_people: "f0e35e679b9f4e17aa555ffbc8d5015e"
colors:
  background: "#050403"
  depth: "#0d0907"
  surface: "#100907"
  surface_2: "#17100c"
  surface_3: "#20150f"
  text: "#fff4e6"
  muted: "rgba(255, 244, 230, 0.68)"
  faint: "rgba(255, 244, 230, 0.42)"
  border: "rgba(255, 244, 230, 0.10)"
  border_strong: "rgba(255, 244, 230, 0.18)"
  gold: "#f1bf7b"
  ember: "#ff9f5f"
  cyan: "#88daf7"
  success: "#8bd7a8"
  danger: "#ff716c"
typography:
  family: Inter for operational surfaces, existing brand/display font only for brand chrome
  h1: 20px to 24px, 600 weight, normal tracking
  h2: 16px to 20px, 600 weight, normal tracking
  body: 13px to 14px, 18px to 20px line-height
  label_caps: 10px to 11px, 700 weight, uppercase, 0.06em to 0.12em tracking
  data: tabular numbers, 13px to 14px
radius:
  control: 8px
  container: 12px
  max: 12px
spacing:
  base: 4px
  page_gap: 12px
  panel_padding: 12px to 16px
  toolbar_padding: 12px to 16px
---

# Argos Operational Design System

This file is the implementation rubric for authenticated Argos pages. It is derived from the Google Stitch project `7663541137437451553`, the generated Stitch screens recorded in `.stitch/argos-authenticated-simplicity-pass.md` and `.stitch/argos-deep-page-simplicity-pass.md`, and the current Argos forge tokens.

Do not implement from prose alone. Use this file to translate the approved Stitch structure into the existing Argos components, data models, routes, validation, permissions, and product language.

## Product Feel

Argos should feel like a simple operational SaaS product that happens to carry a lot of power. The target is closer to GoHighLevel's practical page composition than to a marketing dashboard: compact headers, clear tables, obvious filters, small action surfaces, and no decorative hero treatment.

The user should always know:

- What job this page is for.
- What table, workbench, or form is primary.
- What the next action is.
- Where supporting context lives.

Every authenticated page follows one rule: one page, one primary job.

## Core Layout

Authenticated pages use this structure:

1. App shell with left navigation and top account/actions.
2. Short `OperationalToolbar`.
3. Optional `OperationalMetricStrip`, only when it reduces decision time.
4. One main work surface.
5. Optional right preview/status drawer, never more than one.

The body should not feel like a stack of feature cards. The main work surface is usually a table, form, transcript/workbench, practice stage, or compact settings matrix.

## Navigation Rules

- Left nav contains primary product areas only: Dashboard, Calls, Highlights, Training, Roleplay, Team, Leaderboard.
- Settings stays pinned at the bottom-left system area.
- Notifications are not a left-nav item. They live under the top-right account/notification area.
- Do not duplicate Settings in both the main nav and the bottom system area.
- Top-right actions should remain short: Upload call, account/team menu, notifications, avatar.
- Secondary left rails are rare. Use them only for dense workspaces with durable local navigation, currently Curriculum and Settings.
- Secondary rails dock flush against the right edge of the primary rail on desktop. They are full-height shell rails, not rounded page cards.
- Secondary rails must be collapsible on desktop and become horizontal local navigation on mobile.
- Secondary rails are mostly navigation-only. The Curriculum rail may include durable module actions (`Create module`, `Edit selected module`, `Assign selected module`) because they operate on the selected module. Keep forms, filters, upload actions, AI generation, and other heavy controls in the main work area, modal, or right drawer.

## Page Composition Rules

Use these primitives as the default implementation path:

- `OperationalWorkspace` wraps the page body.
- `OperationalToolbar` owns title, short description, status chip, compact page tabs, and primary actions.
- `OperationalMetricStrip` owns the top row of page-level metrics. Do not repeat the same facts below in `MetricCard` grids.
- Main list pages use a dense table plus right drawer.
- Detail pages use a 65/35 or table-plus-drawer workbench.
- Settings detail pages use the shared docked settings rail plus dense main panel plus status drawer.

Avoid:

- Nested cards inside cards.
- Large rounded panels beyond 12px radius.
- Repeated metric grids below a metric strip.
- Marketing-style page heroes.
- Page descriptions that explain the whole feature instead of orienting the workflow.
- Secondary rails on normal list, detail, inbox, upload, learner, history, team, profile, or leaderboard pages.
- Two local sidebars inside the same work surface.
- Unbounded card grids for data that should scan as a table.
- Segment rows that are just anchors into one huge page.
- Old `ForgeWidget`, `MetricCard`, or `SurfacePanel` layouts after the route has an operational shell.

## Visual Density

The Stitch direction is compact. Use 12px gaps and 12px to 16px panel padding by default. Reserve larger spacing only for empty states or complex form sections that need breathing room.

Tables should be preferred for lists of records, reps, calls, permissions, teams, highlights, leaderboard rows, notifications, and settings resources. Cards are allowed for mobile representations, modals, empty states, and single selected objects.

## Typography

Use normal tracking in implementation. The Stitch theme included compact heading tracking, but Argos page work should avoid negative letter spacing and heavy display treatment. Page headings should be compact and plain.

Use uppercase label styles sparingly for table headers, section eyebrows, and metadata. Do not create a page that is mostly uppercase labels.

## Color And Tone

The base app remains dark, warm, and operational:

- Background: near black.
- Surfaces: warm charcoal.
- Borders: low-contrast warm outlines.
- Primary accent: gold, reserved for the main action, active states, selected rows, and important status.
- Cyan: informational.
- Green: success/complete.
- Ember: attention/warning.
- Red: destructive/failure.

No gradients are needed inside work surfaces except where an existing primary button primitive already uses one. Avoid decorative glows, bokeh, and large background effects in authenticated pages.

## Component Patterns

### Toolbar

The toolbar is compact. It should include:

- Eyebrow only when it clarifies the product area.
- One direct title.
- One sentence of context at most.
- One status chip.
- One to two actions.
- Optional tabs only when they switch meaningful views, not when they jump down a long page.

### Metric Strip

Use up to four metrics. The strip should summarize page state, not decorate the page.

Remove the strip when:

- It repeats table counts already visible.
- The page is a focused form.
- The page is a simple inbox.
- Metrics are not actionable.

### Tables

Tables are the default for operational data. Good table columns are:

- Primary object.
- Owner/status.
- One performance metric.
- One date or state.
- Action.

Avoid tables with seven or more columns unless each column is required for the primary decision.

### Preview Drawer

The drawer is supporting context. It should not become a second page.

Use it for:

- Selected row summary.
- Readiness/status.
- Next action.
- Scoped metadata.

Do not put another full navigation rail, multi-step wizard, or large nested form inside the drawer.

### Settings Detail

The generated Settings People screen is the template for settings detail routes:

- Collapsible settings secondary rail on the left.
- Dense table or matrix in the middle.
- Status/readiness drawer on the right.

Each settings page should expose one primary configuration job. Settings may later hold training defaults, permissions, AI defaults, and notification rules, but it should not become the place where admins author training content. Advanced create/edit flows may open an inline drawer or modal, but they should not make the default page feel like a builder.

### Secondary Rail

Use a secondary rail only when removing it would make the page harder to operate:

- `/training/builder`: visible label `Curriculum`, with module navigation only.
- `/settings` and `/settings/*`: settings section navigation.

Do not use a secondary rail on `/dashboard`, `/calls`, `/calls/[id]`, `/highlights`, `/training`, `/training/team`, `/roleplay`, `/roleplay/history`, `/team`, `/team/[repId]`, `/leaderboard`, `/upload`, or `/notifications`.

## Route Targets

### `/dashboard`

Primary job: answer "what needs attention now?"

Target shape:

- Toolbar with role scope and upload/team action.
- One metric strip.
- Main "Today" table/list with calls, coaching flags, assignments, and setup items.
- Right drawer with selected item and next action.

Do not keep separate metric cards, broad analytics widgets, org skill averages, call volume charts, rep matrix, setup health, and badges all on the same default page. Move deep analytics to Team, Leaderboard, Training, Calls, or Settings.

### `/calls`

Primary job: find and review calls.

Target shape:

- Toolbar with saved views and one filter row.
- Metric strip only if it shortens review decisions.
- Dense calls table.
- Right preview drawer for the selected call.

Keep upload as the primary action. Do not let filters, saved views, and status chips dominate the first viewport.

### `/calls/[id]`

Primary job: review one call and create coaching evidence.

Target shape:

- Breadcrumb toolbar.
- Metric strip with rep, duration, score, status.
- 65/35 review bench.
- Left: tabs for transcript, moments, summary, notes.
- Right: score/category/moment context.

Do not add video playback until real playback data exists.

### `/upload`

Primary job: upload a call successfully.

Target shape:

- Focused upload form and progress lifecycle.
- Readiness drawer with accepted files, required context, and destination.
- One lifecycle/progress strip total.

Do not duplicate the same three-step upload explanation in both the route and panel.

### `/highlights`

Primary job: scan reusable coaching evidence.

Target shape:

- Evidence table.
- Right drawer for selected observation/recommendation.
- Minimal filters or saved views when the dataset grows.

### `/training`

Primary job: complete assigned curriculum.

Target shape:

- Default learner-first module table/list.
- Selected module stage.
- Small progress/status drawer.

Manager work should not overwhelm the learner surface. Team progress and Curriculum should be separate views or deeper pages, not anchor tabs into one giant surface. Do not render create, edit, generate, assignment, or secondary-rail controls on the learner route.

### `/training/builder`

Visible label: `Curriculum`.

Primary job: author and assign training modules.

Target shape:

- Docked collapsible module rail with `Create module`, `Edit selected module`, and `Assign selected module` above the module list.
- Module preview as the main work surface.
- `Generate with AI` lives inside the `Create module` flow, not as a persistent rail or main-page action.
- Assignment remains a focused modal, not a persistent rail or right drawer.

Do not use learner labels like `Course builder` or `Module editor preview`. Do not use a right-side `Builder controls` drawer.

### `/roleplay`

Primary job: practice one scenario.

Target shape:

- Scenario picker.
- Practice stage.
- Score/readiness drawer.
- History as a compact table or separate view.

Avoid bookend rails plus history plus scorecard plus practice transcript all visible at once.

### `/team`

Primary job: scan reps and decide who needs coaching.

Target shape:

- Dense roster table.
- Right drawer for selected rep.
- One compact status/segment row at most.

Avoid extra segment cards and overly wide roster columns. The table should answer status, score, calls, trend, and action first.

### `/team/[repId]`

Primary job: inspect one rep's coaching focus.

Target shape:

- Rep toolbar and metric strip.
- 65/35 coaching workbench.
- Left: focus categories, recent calls, trend.
- Right: rep summary and next action.

Do not split attention across multiple equal-weight card grids.

### `/leaderboard`

Primary job: compare reps.

Target shape:

- Metric strip.
- Ranked table.
- Right drawer.
- Compact view switcher.

This page can remain table-heavy.

### `/notifications`

Primary job: account inbox.

Target shape:

- Simple notification list grouped by day.
- Account-scope filters only if functional.
- Right drawer optional.

Since Notifications moved out of left nav, this page should feel secondary and lighter than a primary product surface.

### `/settings`

Primary job: map account and admin settings.

Target shape:

- Internal settings subnav.
- Compact settings map.
- Inline account panel only if it remains short.
- Organization drawer.

### `/settings/people`

Primary job: manage members and invites.

Target shape:

- Member table.
- Invite action/drawer.
- Pending invites in the drawer or compact side list.

Avoid adding a second `ForgeWorkspaceLayout` inside the Settings layout.

### `/settings/teams`

Primary job: manage team records and memberships.

Target shape:

- Team table.
- Selected team drawer.
- Create/edit team as a compact modal or drawer.

### `/settings/permissions`

Primary job: assign permission presets and manager boundaries.

Target shape:

- One team context selector.
- One dense matrix/table.
- Status drawer.

Avoid separate stacked tables for presets and primary managers on the default view.

### `/settings/integrations`

Primary job: connect or monitor providers.

Target shape:

- Provider status table or two compact provider rows.
- Connection action.
- Drawer with webhook/auth status.

### `/settings/rubric`

Primary job: review active rubric and start an edit.

Target shape:

- Active rubric summary.
- Category weights table.
- Version history.
- "Edit rubric" opens a focused builder route, modal, or dedicated mode.

Do not show source rail, category editor, readiness rail, publish controls, import controls, and version history all at once on the default settings page.

### `/settings/compliance`

Primary job: verify compliance posture.

Target shape:

- Status rows for recording consent, retention, safeguards, and audit state.
- Drawer with current record and next review.

## Split Guidance

Split a page when one route has two different user jobs with different rhythms.

Worth splitting:

- `/dashboard`: keep as "Today"; move analytics/setup detail into existing pages.
- `/training`: learner view, team progress, and Curriculum should remain separate views/routes or true mode pages.
- `/roleplay`: practice and history/results should be separate views or progressive modes.
- `/settings/rubric`: active overview and rubric builder should be separated.
- `/settings/permissions`: preset assignment and primary manager assignment should be separated or tabbed into true views.

Probably do not split:

- `/calls`: table plus drawer is the right model.
- `/highlights`: table plus drawer is the right model.
- `/team`: simplify table and drawer before adding routes.
- `/leaderboard`: table plus drawer is the right model.
- `/upload`: single focused flow is the right model.

## Audit Checklist

A page matches this design when all of these are true:

- The first viewport shows the main work surface, not a stack of intro panels.
- There is only one primary job on the page.
- Page-level metrics are not repeated in lower cards.
- The default body is a table, workbench, form, or practice stage.
- There is at most one right drawer.
- Settings pages do not nest another rail layout inside the settings layout.
- Tabs switch real views or modes; they are not just anchors into a long page.
- Data-heavy content is scannable without reading every card.
- The page can be understood in under five seconds.
