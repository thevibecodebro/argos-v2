# Argos Backend Redesign — Build Plan (Option A)

Branch: `redesign/argos-option-a` (worktree at `../argos-v2-redesign`)
Base: `main` @ the workspace-branding merge (per-org theming already present)
Design source: Claude Design handoff — *Argos App — Option A* (collapsible rail + mobile tab bar, warm-neutral light theme, Indigo accent)

---

## Guiding constraints

1. **No loss of functionality.** Every page keeps its existing data loaders, server actions, and routes. We replace the presentation layer only.
2. **Reuse, don't rebuild.** The per-org theming system merged from `workspace-branding` (modes, presets, per-field colors, WCAG validation, `/settings/branding`, shell wiring) is the foundation. We extend it; we do not duplicate it.
3. **Ship in independently-mergeable slices.** Each phase is its own PR off this branch into `main`. `main` stays buildable at every step (typecheck + 848 tests green is the bar).
4. **Per-org brand customization is first-class.** The Option-A accent/light look ships as a *preset*, so every office can adopt or override it.

---

## What already exists on `main` (do not rebuild)

- `organizations.workspace_theme` jsonb column (+ migration `202606180001_workspace_theme.sql`)
- `lib/organizations/workspace-theme.ts` — modes (`dark`|`light`), presets (`argos`, `ocean`, `forest`, `violet`, `crimson`, `daylight`, `mist`, `sage`, `custom`), per-field colors, **WCAG contrast validation**
- `/settings/branding` page + `WorkspaceBrandingPanel` + `/api/organizations/branding` route
- App shell reads the org theme and applies it (`app-shell.tsx`, `globals.css` token block)
- Current default: `activeMode: "dark"`; existing light preset is **cool blue** (`#F8FAFC` / `#1A5FB4`)

## What's missing vs. Option A (this is the work)

1. **Warm-Indigo light look** is not a preset, and light is not the default.
2. **Mobile bottom tab bar** — today mobile uses an overlay drawer.
3. **Page templates** — the 11 page areas still use the current (dark-tuned) forge layouts, not the Option-A layouts.
4. **Typography** — app uses Geist only; Option A/Superhuman direction calls for Inter (body) + Geist Mono (numerals/tabular). Decision flagged in Phase 1.

---

## Phase 1 — Theme foundation (warm Indigo light preset)

**Goal:** Option A's exact look becomes a selectable, WCAG-valid preset, and the default for the workspace.

- Add an **`argos-light` (Warm Indigo)** preset to `workspace-theme.ts`:
  - Canvas `#FFFFFF`, Canvas-soft `#FAFAF8`, Hairline `#E8E4DD`
  - Ink `#292827`, Ink-mute `#73706D`, Ink-faint `#9A9794`
  - Accent **Indigo `#1B1938`**, accent-soft / accent-line tints
  - Status: success `#4A7D5C`, warning `#A4762E`, danger `#B04A42`, info `#3D6F8C`
  - Rail/topbar surfaces tuned warm (light rail `#FFF`, hairline borders)
- Run it through the **existing WCAG validator**; adjust any pair under 4.5:1 / 3:1.
- Set the **default mode to `light`** with `argos-light` as the default preset for new orgs (keep dark presets available).
- Make the other Option-A accents (Teal/Clay/Slate/Plum) available as accent choices within the light mode.
- **Typography decision (needs your call):** keep Geist, or add **Inter** (body) + **Geist Mono** (tabular numerals) via `next/font`. Plan assumes: add Inter + Geist Mono, wire `--font-ui` / mono var, enable `font-variant-numeric: tabular-nums` for scores/ranks/durations (matches both DESIGN.md and Option A).
- **Verify:** existing `workspace-theme.test.ts` + `workspace-theme-css.test.ts` stay green; add cases for the new preset + contrast.

_PR 1: "Add warm-Indigo light preset + default light mode"_

## Phase 2 — Shell / nav (the genuinely new behavior)

**Goal:** the Option-A app shell — keep all current shell functionality, add the mobile bottom bar.

Reuse `app-shell.tsx` structure; changes:
- **Mobile (<640px):** replace the overlay drawer with a **5-item bottom tab bar** — Home · Calls · ＋(Upload FAB) · Coach · Me. `Me` routes to account/settings; notifications badge surfaces on the relevant tab.
- **Tablet (640–1024px):** rail auto-collapses to **icon-only** (logic already present via `primaryRailCollapsed`).
- **Desktop (≥1024px):** full **grouped** rail with section headers (Review / Coach / People / System) — groups already defined; render the headers + add the **System** group (Notifications, Settings) to match Option A.
- **Topbar:** page kicker + title, **search field with ⌘K affordance**, and a single **primary Upload button** (＋). One primary action per surface (DESIGN.md principle 3).
- **Preserve, do not regress:** role-based group visibility, collapsible-rail localStorage, account menu (feedback, product guide, notifications, sign out), platform org switcher, role onboarding guide, navigation-pending a11y/announcements, org logo display.
- Fix the **active-state interpolation bug** noted in the design chat (no CSS transition between `transparent` and a `var()` color).
- **Verify:** `app-shell.test.ts` + `settings-nav.test.tsx` green; add a render test asserting bottom-bar on mobile and grouped rail on desktop.

_PR 2: "Option-A app shell: grouped rail + mobile bottom tab bar"_

## Phase 3 — Brand & appearance settings (align to Option A)

**Goal:** the `/settings/branding` page presents the Option-A "Brand & appearance" experience on top of the existing panel.

- Reframe `WorkspaceBrandingPanel` UI to the Option-A layout: **accent swatches** (Indigo/Teal/Clay/Slate/Plum) + **logo upload** + **live preview** card — backed by the existing theme model and API (no new backend).
- Keep advanced per-field controls available (progressive disclosure), so power users retain the full editor.
- **Verify:** `workspace-branding-panel.test.tsx` green; add a test for accent-swatch selection writing the expected theme.

_PR 3: "Brand & appearance settings aligned to Option A"_

## Phase 4 — Page templates (one PR each, data preserved)

Shared scaffold first, then convert pages. Each keeps its loaders/actions; only layout/markup changes. Order chosen by traffic + dependency:

1. **Shared page scaffold** — `PageHeader` (kicker/title/one primary action), toolbar, work-object container, optional right drawer — per DESIGN.md Layout Contract.
2. **Dashboard** — queue-first "Needs attention" + secondary stat strip + setup/brand shortcuts.
3. **Calls** — table-first, filter chips, Upload primary, row → detail.
4. **Call detail** — transcript/evidence + scorecard drawer, contextual coaching actions.
5. **Team + Rep profile** — roster/risk table + selected-rep drawer (score, trend, plan).
6. **Coach (Training + Roleplay)** — learner lesson first / active session first.
7. **Leaderboard** — rank table.
8. **Highlights** — coaching-evidence cards → source call.
9. **Notifications** — inbox list (no metric strip).
10. **Upload** — single focused form.
11. **Settings shell** — align secondary rail + dense panels (People/Teams/Permissions/Integrations/Rubrics/Compliance) to the light system.

_PRs 4.x: one per page, each independently mergeable._

## Phase 5 — QA pass (DESIGN.md QA Contract)

- Focused render tests for structure + forbidden stale copy
- `npm run typecheck:web`, `npm run test:web`, `git diff --check`
- Desktop + mobile screenshots per redesigned screen
- First-viewport scan: duplicate chrome, nested cards, long prose, fake controls

---

## Resources & component stack (from design chat, reconciled with repo)

**Principle (from chat):** one UI system — extend `@argos-v2/ui` (Radix + Tailwind v4 tokens + lucide-react). Do **not** add shadcn as a parallel system. Sleek comes from restraint, not more libraries.

**Already installed — reuse, don't re-add:**
- `lucide-react` — the app's icon system, wrapped by `ForgeIcon` (~120 icons mapped). Keep using it.
- `@argos-v2/ui` — `clsx` + `tailwind-merge` (`cn()`) + `class-variance-authority` (variants). This is the component foundation.
- Existing `forge.tsx` primitives (ForgeSurface/Button/Chip/Icon…) — restyle to light tokens, don't replace.

**Add incrementally, only when a screen needs it:**

| Library | Purpose | Phase |
|---|---|---|
| Radix primitives (`@radix-ui/*`) | accessible menus / dialogs / tabs / popovers | 2 + as needed |
| `cmdk` | ⌘K command palette | 2 |
| `@tanstack/react-table` | Calls list (sort/filter/paginate) | 4 – Calls |
| `recharts` | score trends / sparklines | 4 – Rep profile |
| `wavesurfer.js` | call audio waveform + scrub | 4 – Call detail |
| `sonner` | toast notifications | 4 (first mutation screen) |
| `framer-motion` / `@formkit/auto-animate` | subtle transitions only | as needed |

**Fonts:** Inter (body) + Geist Mono (tabular numerals) via `next/font` — see Phase 1 typography decision.
**Avatars/illustrations (optional, per chat):** Boring Avatars / DiceBear for rep avatars; unDraw (recolored to accent) for empty states. MIT-class, add only if a screen calls for it.

All libraries above are MIT/ISC/BSD/OFL — safe for commercial use and React 19 / Tailwind v4 compatible (Tremor was explicitly dropped in the chat for being Tailwind-v3-bound).

## Open decisions for you

1. **Typography:** add Inter + Geist Mono (recommended, matches Option A) or stay on Geist only?
2. **Default mode:** make `light` the workspace default now, or keep `dark` default and ship `argos-light` as opt-in until pages migrate?
3. **Start point:** Phase 1 (theme foundation) is the natural first PR; confirm or pick another entry (e.g. Phase 2 shell first against existing light preset).
