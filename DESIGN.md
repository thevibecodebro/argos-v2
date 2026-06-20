# Argos Authenticated Design System

Status: source of truth for authenticated product UI.

This file supersedes the dark "Forge-command" aesthetic for authenticated pages. The redesign moves Argos to a **light, warm-neutral, Indigo-accented** system that is mobile-first, fluid, and **per-tenant themeable**. Existing `Forge*` component names and `--forge-*` CSS variables remain — they are now driven by the workspace theme tokens (see _Theming & brand_), so the names persist while the visual behavior becomes calm, readable, light product UI.

Lineage: the palette, type system, and shape/spacing tokens are distilled from the `DESIGN-superhuman.md` source language. We pull its **primitives** (warm neutrals, Indigo accent, Inter at sub-default weights, 8px-base spacing, radius/elevation ladders, inputs) and deliberately **leave its marketing-only treatments** (hero portraits, three-canvas rhythm, mandatory closing teal band, single-CTA pages, 64–128px section padding). See _What we left behind_.

## Design Goal

Argos should feel like a calm operational SaaS tool for sales managers and reps — now light by default and suitable for a chiropractic-office front desk as much as a sales floor. The UI makes the primary work object obvious: a queue, table, transcript, form, or practice session.

Scene sentence: A manager is reviewing calls and coaching risk between meetings — on a phone at the desk, a tablet in a room, or a desktop monitor. They need to scan, decide, and move to the next action without reading decorative chrome.

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
11. **Mobile-first and fluid** — every surface works at phone width and scales up; tables fold into row-cards.
12. **One accent, themeable per tenant** — greyscale UI + a single brand accent that an org can re-skin live.

## Visual Language

A light, warm-neutral product theme. Calm, clinical, legible. Greyscale carries the UI; a single Indigo accent carries action, active state, and selection.

The palette below is the **default workspace theme** (warm-Indigo light). It is implemented as the default light mode in `apps/web/lib/organizations/workspace-theme.ts` and rendered through `--forge-*` variables. Every value is WCAG-checked by the theme's contrast rules.

### Default light palette (warm Indigo)

- Canvas (page): `#FAFAF8`  → `--forge-bg`
- Depth (behind rails): `#F1EEE8`  → `--forge-depth`
- Surface (cards, rail): `#FFFFFF`  → `--forge-surface`
- Surface raised (rows, hover, active tint): `#F4F1EA`  → `--forge-surface-2`
- Surface high: `#EAE6DE`  → `--forge-surface-3`
- Ink (body text): `#292827` — warm dark grey, never pure black  → `--forge-text`
- Ink mute (secondary): `#73706D`  → `--forge-muted`
- Hairline (1px borders): `#E8E4DD`  → `--forge-border`
- Hairline strong: `#DDD8D0`  → `--forge-border-strong`
- Accent / primary (Indigo): `#1B1938`  → `--forge-gold` (legacy name; now the accent slot)
- On-accent: `#FFFFFF`  → `--forge-on-accent`
- Info / secondary: `#3D6F8C`  → `--forge-cyan`
- Warning: `#A4762E`  → `--forge-ember`
- Success: `#4A7D5C`  → `--forge-success`
- Danger: `#B04A42`  → `--forge-danger`
- Focus ring: `#1B1938`  → `--forge-focus`

### Color usage

- Accent (Indigo): primary action, active route, selected row, key focus state.
- Info: informational status and processing.
- Warning: attention / at-risk.
- Success: complete / on-track.
- Danger: destructive and failure.
- Warm neutrals: everything else.

Avoid decorative gradients, grid textures, bokeh, large background effects, and glow-heavy panels. Depth comes from hairlines and one of two soft shadows (see _Elevation_), not from glow.

## Typography

- **Inter** is the single UI sans (`--font-ui`, loaded via `next/font`). It is the warmth signature — favor the variable mid-weights (≈460 body, 540 titles/numbers, 600 compact labels) over default 400/500/700.
- **Geist Mono** supplies **tabular numerals** for scores, ranks, counts, and durations (`--font-numeric`; apply via `.forge-tabular-nums`).
- `--font-display` and `--font-body` are compatibility aliases for `--font-ui`, not separate voices.
- Page title: 20–24px, ~540 weight.
- Section title: 16–18px, ~540 weight.
- Body/table text: 13–14px, ~460 weight.
- Labels: 11–12px, ~600 weight; uppercase only for table headers and short metadata.
- Negative tracking only on large titles; body stays at 0.
- Always use tabular numerals for scores, ranks, counts, and durations.

## Layout Contract

Default authenticated page order:

1. App shell (rail + topbar on desktop/tablet; topbar + bottom tab bar on mobile)
2. Compact page header or toolbar
3. Optional controls row
4. Primary work object
5. Optional right drawer when it helps a selected object
6. Secondary/supporting sections below the fold

The first viewport should not show a page header card, a metric strip, a tabs row, a filters row, a table, and a drawer at once unless each layer is essential to the decision.

## Component Contract

### App Shell

- Left navigation contains primary tenant routes only, grouped: **Review** (Dashboard, Calls, Highlights) · **Coach** (Training, Roleplay) · **People** (Team, Leaderboard) · **System** (Notifications, Settings).
- Desktop: full grouped rail, collapsible to icons. Tablet: rail collapses to icons. Mobile: rail becomes a 5-slot bottom tab bar (Home · Calls · ＋ · Coach · Me) with a single centered ＋ for the primary capture action.
- Settings is pinned to the system/footer area; account actions and notifications live in the top/account area.
- Active state is a calm full-row state (accent fill or accent tint), not a colored stripe or glow. Do not animate `background` between `transparent` and a `var()` color — browsers freeze the computed value; toggle a class instead.
- Org logo and accent come from the workspace theme; the rail shows the tenant logo when present.

### Page Header

- Compact, unframed or lightly separated. One title, one sentence max.
- One primary action and at most one secondary action. No hero composition.

### Toolbar And Controls

- Controls stay close to the table/list/form they affect. Search first when search exists.
- Filters collapse when they are not the primary task. Saved views must be real route/filter state, not inert pills.
- ⌘K command palette is the global jump-to; the topbar search affordance opens it.

### Metric Strip

Use only when it changes what the user does next. Remove it when it repeats table counts, describes a process step, the page is a focused form or an inbox, or the page is already a detail view with the same values visible.

### Tables And Lists

Default columns: primary object · owner/status · one performance metric · date/state · action. Avoid seven or more columns unless the page is explicitly a comparison table. On mobile, tables become dense row-cards.

### Preview Drawer

Supporting context, not a second page. Use for selected-row summary, readiness/status, next action, small metadata. Do not use for duplicated metrics, another nav rail, multi-step forms, or large prose.

### Settings

Configuration workspaces: a secondary settings rail plus a dense active panel (table, matrix, or form). Builder flows are inline expandable sections, drawers, or modals — never stacked cards. **Brand & appearance** lives here (accent, logo, light/dark, presets).

## Shape, Spacing & Elevation

8px-base spacing scale: 2 · 4 · 8 · 12 · 16 · 24 · 32 (fine sub-tokens 2/4/12 for tight work). Density is themeable (Comfortable / Compact) via gap/padding tokens.

Radius ladder: inputs **6px**, buttons **8px** (rounded rectangle, never pill in-app), cards **12px**, modals/large cards **16px**.

Elevation (two soft shadows only): level 1 `0 1px 3px rgba(41,40,39,0.08)` for card lift; level 2 `0 8px 24px rgba(41,40,39,0.12)` for floating panels and modals. No glow.

### Forms & inputs

White field, 6px radius, hairline border, 10–12px padding. Touch targets ≥ 44×44px on mobile; form fields keep a 44px minimum height. Directly reusable for Upload, Settings, and invite flows.

## Route Shape

- Dashboard: queue-first "needs attention" view. Metrics are secondary.
- Calls: table-first review workspace. Upload is the primary action.
- Call detail: transcript/evidence-first workbench. Coaching actions are contextual.
- Highlights: coaching evidence. Source call is the primary action.
- Upload: single upload form. No process metric strips.
- Roleplay: active simulation first. Persona selection supports the session.
- Training: learner lesson first; manager tools behind contextual actions.
- Team: roster/risk table first. Drawer summarizes the selected rep.
- Rep profile: identity, score, trend, evidence, coaching plan.
- Leaderboard: rank table. Metrics only if they clarify ranking.
- Notifications: inbox list. No metric strip by default.
- Settings: configuration rail plus dense active panel; includes Brand & appearance.

## Theming & Brand (per tenant)

Theming is purely additive and lives on the organization, so it can never regress legacy behavior.

- Storage: `organizations.workspace_theme` (jsonb). Resolution + validation in `apps/web/lib/organizations/workspace-theme.ts`.
- A theme defines both a **light** and a **dark** mode (`colors` + `navigation`) and an `activeMode`. The default is **light, warm Indigo**.
- The shell applies the theme by setting `--forge-*` variables at the root (`workspaceThemeToForgeVars`). Orgs without a saved theme fall back to the default light theme.
- **Presets**: Argos Light (default), Argos Dark (the original gold look), plus Daylight / Mist / Sage (light) and Ocean / Forest / Violet / Crimson (dark), and Custom.
- **Accessibility is enforced**: saving a theme runs WCAG contrast rules (body text ≥ 4.5:1, muted ≥ 3:1, on-accent ≥ 4.5:1, focus ≥ 3:1, plus navigation rules). A theme that fails cannot be saved.
- Admin surface: `/settings/branding` (`WorkspaceBrandingPanel`). Logo upload is the existing per-org branding control.

## What We Left Behind (marketing-only)

From the source `DESIGN-superhuman.md`, these belong to the marketing site and are **out of scope** for the authenticated workspace:

- Three-canvas hero/white/teal rhythm and the mandatory closing teal band.
- Half-bleed twilight portrait subjects and the violet-sky atmospheric backdrop.
- Single-CTA-per-band pacing and 64–128px section padding.
- Pill buttons (hero-only by the source's own rule → in-app we use the 8px rounded rectangle).
- Extra accent colors beyond the one tenant accent + status hues.

## QA Contract

Every major authenticated UI pass needs:

- Focused render tests for structure and forbidden stale copy.
- Typecheck (`npm run typecheck:web`).
- `git diff --check`.
- Theme contrast green for any palette change (`workspace-theme` contrast rules).
- Desktop, tablet, and mobile checks before claiming visual completion.
- A first-viewport scan for duplicate chrome, nested cards, long text, and fake controls.
