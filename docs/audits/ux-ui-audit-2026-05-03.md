# Argos UX/UI Audit - 2026-05-03

## Executive Summary

Argos is moving toward one coherent product. The current branch has a much stronger authenticated system than the 2026-04-30 audit: shared `PageFrame`, `AuthenticatedPageContainer`, Forge surfaces, status panels, mobile table cards, workspace rails, the operational Calls layout, and explicit Upload states are all present in current code. The product direction is clear: public marketing, call review, coaching evidence, training, roleplay, people operations, and settings all speak the same sales-coaching language more often than not.

The remaining UX/UI risk is not that the app is missing a design system. It is that there are now several overlapping versions of it:

- The Forge source of truth lives in `apps/web/app/globals.css`, `apps/web/components/forge.tsx`, `apps/web/components/page-frame.tsx`, and `apps/web/components/authenticated-page-container.tsx`.
- Calls has a newer operational workspace pattern in `apps/web/components/operational-workspace.tsx`.
- Team, training, people, teams, permissions, and rubrics still carry large local panel/form/table patterns and custom shadows.
- There is no repo `PRODUCT.md` or `DESIGN.md`, so future UI decisions still depend on reading current code rather than a durable product/design contract.

The highest-impact next work is to finish consolidation around the current Forge/operational model, visually verify authenticated routes with a real signed-in session, and clean up the remaining places where UI copy or affordances over-promise the behavior.

## Repo State Checked

- Target repo: `/Users/thevibecodebro/Projects/argos-v2`
- Git root: `/Users/thevibecodebro/Projects/argos-v2`
- Current branch: `codex/operational-layout-calls`
- Current status at audit time:
  - Modified: `apps/web/app/(authenticated)/calls/calls-filters.tsx`
  - Modified: `apps/web/app/(authenticated)/calls/page.tsx`
  - Modified: `apps/web/components/app-shell.tsx`
  - Modified: `apps/web/lib/app-shell.test.ts`
  - Modified: `apps/web/lib/calls-filters-forge.test.tsx`
  - Modified: `apps/web/lib/primary-route-hero-removal.test.ts`
  - Untracked: `.stitch/`
  - Untracked: `apps/web/components/operational-workspace.tsx`
  - Untracked: `apps/web/lib/operational-workspace.test.tsx`
  - Untracked: `docs/audits/`
  - Untracked: `docs/design/authenticated-forge-ux-audit.local-before-pr9.md`
  - Untracked: `docs/superpowers/plans/2026-04-27-highlevel-inspired-authenticated-argos-implementation.md`
- Worktrees also exist under `/Users/thevibecodebro/.codex/worktrees/*`, including the automation worktree, but this audit inspected the requested root repo.

## Visual Source Of Truth

The current source of truth is code, not docs.

- No `PRODUCT.md` or `DESIGN.md` was found by the Impeccable context loader.
- Forge tokens are defined in `apps/web/app/globals.css:3-42`.
- Authenticated shell, surfaces, nav, buttons, forms, focus rings, workspace rails, table shells, and reduced-motion handling are in `apps/web/app/globals.css:75-823`.
- Legacy public/default tokens still remain in `apps/web/app/globals.css:825-843`.
- Public homepage styling is scoped under `.argos-3d-page` in `apps/web/app/globals.css:881-930` and later.
- Shared UI primitives live in `apps/web/components/forge.tsx`.
- Shared page framing lives in `apps/web/components/page-frame.tsx:31-140`.
- Shared authenticated gutters/max widths live in `apps/web/components/authenticated-page-container.tsx:18-34`.
- Calls now uses a newer operational layout family in `apps/web/components/operational-workspace.tsx`.

## Route And Page Inventory

### Public And Auth Routes

| Route | Main source | Notes |
|---|---|---|
| `/` | `apps/web/app/page.tsx`, `apps/web/components/public/landing-page.tsx` | Public homepage and pricing. |
| `/login` | `apps/web/app/login/page.tsx`, `apps/web/components/auth/login-form.tsx`, `apps/web/components/legacy-shell.tsx` | Google and magic-link auth. |
| `/onboarding` | `apps/web/app/onboarding/page.tsx`, `apps/web/components/onboarding-panel.tsx` | Create org, join org, invite teammates. |
| `/invite/[token]` | `apps/web/app/invite/[token]/page.tsx`, `invite-accept-button.tsx` | Invite state handling: invalid, expired, accepted, unauthenticated, wrong account, ready. |
| `/auth/error` | `apps/web/app/auth/error/page.tsx` | Callback failure recovery. |
| `/privacy-policy` | `apps/web/app/privacy-policy/page.tsx` | Legal page. |
| `/security-policy` | `apps/web/app/security-policy/page.tsx` | Legal page. |
| `/terms-of-service` | `apps/web/app/terms-of-service/page.tsx` | Legal page. |

### Authenticated Product Routes

| Route | Main source | Visual verification |
|---|---|---|
| `/dashboard` | `apps/web/app/(authenticated)/dashboard/page.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/calls` | `apps/web/app/(authenticated)/calls/page.tsx`, `calls-filters.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/calls/[id]` | `apps/web/app/(authenticated)/calls/[id]/page.tsx`, `apps/web/components/call-detail-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/upload` | `apps/web/app/(authenticated)/upload/page.tsx`, `apps/web/components/upload-call-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/highlights` | `apps/web/app/(authenticated)/highlights/page.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/training` | `apps/web/app/(authenticated)/training/page.tsx`, `apps/web/components/training/*` | Source inspected. Needs authenticated screenshot pass. |
| `/roleplay` | `apps/web/app/(authenticated)/roleplay/page.tsx`, `apps/web/components/roleplay-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/team` | `apps/web/app/(authenticated)/team/page.tsx`, `apps/web/components/team/team-views.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/team/[repId]` | `apps/web/app/(authenticated)/team/[repId]/page.tsx`, `team-views.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/leaderboard` | `apps/web/app/(authenticated)/leaderboard/page.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/notifications` | `apps/web/app/(authenticated)/notifications/page.tsx`, `apps/web/components/notifications-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/settings` | `apps/web/app/(authenticated)/settings/page.tsx`, `account-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/settings/people` | `people-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/settings/teams` | `teams-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/settings/permissions` | `permissions-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/settings/compliance` | `compliance-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/settings/integrations` | `integrations-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |
| `/settings/rubric` | `rubrics-panel.tsx` | Source inspected. Needs authenticated screenshot pass. |

## Top 10 UX/UI Issues Ranked By User Impact

1. **Authenticated visual verification is still blocked.** Source shows improvements, but no signed-in desktop/tablet/mobile screenshots were captured. This is the biggest release-confidence gap because layout density, sticky rail behavior, and mobile overflow cannot be confirmed from code alone.
2. **The design source of truth is fragmented.** There is no `PRODUCT.md` or `DESIGN.md`; Forge, public homepage CSS, operational workspace components, and several page-local patterns all serve as competing UI references.
3. **Roleplay does not use the same page contract as the core app routes.** `/roleplay` skips `PageFrame` and still includes local dark slate/blue surfaces, so it can feel like a separate tool rather than a core coaching workflow.
4. **Training is still the largest local style island.** It has good learner/admin structure, but custom white/slate styling, a custom dialog, and tab controls that lack arrow-key behavior make it feel less consolidated than Calls, Upload, and Settings.
5. **Calls preview drawer behavior can imply selection that does not exist.** The preview drawer always uses the first call in the result set, not the row the user is inspecting.
6. **Call detail overweights unavailable playback and has silent note/highlight failure paths.** The media region can take a large player-like slot even when playback is unavailable, and some annotation/highlight mutations ignore non-OK responses.
7. **Settings admin workbenches are functional but dense.** People, teams, permissions, and rubrics now use rails and mobile cards, but the amount of staged state, local cards, and multi-step controls needs visual validation before calling it polished.
8. **Public CTA copy over-promises.** The homepage "Book a demo" link routes to `/login`, which is not a demo-booking flow.
9. **Shell/navigation affordances have a few accessibility and clarity gaps.** The account menu has Escape/focus return but no arrow-key menu behavior; the mobile nav icon is `filter_list`, which reads like filtering rather than menu navigation.
10. **Secondary analytics pages lag the operational pattern.** `/highlights`, `/leaderboard`, and parts of `/team` are mostly Forge-aligned, but they still use one-off bento/marketing-style cards and local shells compared with the newer Calls workspace.

## Findings Table

| Severity | Page/flow | Evidence | User impact | Recommended fix | Verification needed |
|---|---|---|---|---|---|
| High | Whole authenticated app | Dev server started on `127.0.0.1:3137`, but browser/Playwright access was blocked and authenticated screenshots were not captured. | Real users may still hit mobile overflow, clipped text, or rail/table layout failures that source inspection cannot prove. | Run a signed-in visual pass at desktop, tablet, and mobile for all authenticated routes. Store screenshots next to this audit or reference them from a follow-up report. | Required. |
| High | Design system governance | Impeccable context loader returned no `PRODUCT.md` or `DESIGN.md`; visual truth is spread across `globals.css:3-42`, `forge.tsx`, `page-frame.tsx`, `operational-workspace.tsx`, and page-local classes. | New UI work can keep adding almost-right variants of panels, rails, fields, and shadows. | Create a short repo design contract that names Forge as canonical, explains when to use `PageFrame`, `ForgeWorkspaceLayout`, operational layouts, tables, empty states, status panels, and dialog primitives. | Source verification only; no visual block. |
| High | `/roleplay` | `apps/web/app/(authenticated)/roleplay/page.tsx:44-51` uses `AuthenticatedPageContainer` directly instead of `PageFrame`; `roleplay-panel.tsx` has residual local surfaces such as `bg-[#121720]/80` and `rgba(34,38,47,...)` around generated scenario, transcript, and history areas. | Roleplay can feel like a separate mini-app and users may not get the same route-level title, description, action, and status rhythm used elsewhere. | Wrap route in the standard `PageFrame`, replace residual blue/slate surfaces with Forge/operational primitives, and keep the learner/practice layout dense rather than marketing-like. | Required at mobile because the anchor sections and scroll targets need a real viewport check. |
| High | `/training` | `training-module-stage.tsx:42-53` uses white/slate custom stage classes; its tablist is click-driven at `training-module-stage.tsx:63-100`; `training-manager-modal.tsx` duplicates dialog behavior instead of `ForgeDialog`; `training-panel.tsx` defines large local field classes. | Training is a primary workflow, but it can look and behave less finished than Upload/Calls, especially for keyboard users and admins. | Convert module stage, TOC, admin forms, and manager modal to Forge primitives; add arrow-key tab handling or use a simpler segmented control without `role="tab"`. | Required for keyboard and mobile. |
| Medium | `/calls` | `apps/web/app/(authenticated)/calls/page.tsx:57` sets `selectedCall = calls[0]`; preview drawer copy at `calls/page.tsx:406-409` describes the first row in the current view. | Users may expect the preview to follow the row they selected, hovered, or opened. The current behavior is honest in copy but not as useful as the layout implies. | Either rename the drawer as "Latest in this view" and remove selection cues, or add actual selected-row state with keyboard and mobile behavior. | Required for desktop and tablet. |
| Medium | `/calls/[id]` review | `call-detail-panel.tsx:482-566` gives an aspect-video media region even when playback is not available; non-OK API responses are ignored for note/highlight persistence around `call-detail-panel.tsx:231-243`, `260-274`, and `316-323`. | Reviewers may waste attention on unavailable media, and failed notes/highlights can appear to do nothing without actionable feedback. | Reduce unavailable media to a compact status module unless playback exists; surface annotation/highlight errors with `ForgeStatusPanel` and retry affordances. | Required for real call statuses. |
| Medium | `/settings/rubric` | `rubrics-panel.tsx:478-620` and `923-1079` create two rails around a dense category editor; the editor expands many fields per category at `rubrics-panel.tsx:653-855`. | Admins can configure rubrics, but the workbench is mentally heavy and may be hard to operate on tablet or small laptop widths. | Keep the rails but add clearer step scoping, sticky publish/readiness controls, and a compact category row pattern that avoids huge expanded forms by default. | Required for desktop, tablet, mobile. |
| Medium | `/settings/people`, `/settings/teams`, `/settings/permissions` | People, teams, and permissions use workspace rails and mobile cards, but repeat local panel shells and field classes at `people-panel.tsx:394-528`, `teams-panel.tsx:604-820`, and `permissions-panel.tsx:443-715`. | Admin pages work, but staged changes, apply buttons, and rail/main interactions may feel different route to route. | Extract shared management editor primitives for staged select/apply rows, member cards, create/select rails, and status banners. | Required for admin data states. |
| Medium | Public homepage pricing CTA | `landing-page.tsx:278-282` renders "Book a demo" as a link to `/login`. | A buyer looking for a demo lands in sign-in instead of scheduling/contact, which can feel broken or misleading. | Rename to "Sign in" or route to a real demo/contact path when one exists. Preserve current pricing model and product language. | Public visual check recommended. |
| Medium | App shell navigation | Main shell nav groups are Review/Coach/People in `app-shell.tsx:43-65`; mobile nav button uses icon `filter_list` at `app-shell.tsx:274-282`; account menu behavior is handled in `app-shell.tsx:95-118` and `333-384` but lacks arrow-key roving. | New users may not see Settings/Notifications as first-class destinations, and keyboard menu behavior may be below expected menu ergonomics. | Use a clearer menu icon, consider a "System" group or more visible Notifications path, and add arrow-key handling or simplify the account menu roles. | Keyboard and mobile required. |
| Low | Login and invite/onboarding shell | `legacy-shell.tsx:33-36` shows language/help icons that are not interactive; `LegacyAuthShell` uses large brand cards for onboarding/invite at `legacy-shell.tsx:183-225`. | Icons may look clickable but do nothing. Onboarding can feel more like a splash than an efficient setup flow. | Remove decorative icon affordances or make them named buttons with real actions. Compact onboarding/invite shell for faster task completion. | Public/pre-auth visual check recommended. |
| Low | `/highlights` | After the main highlights list, `highlights/page.tsx:153-214` adds "Weekly Coaching Insights" and "Intelligence Health" bento cards. | The page can drift toward dashboard/marketing decoration after users already saw the actionable highlight list. | Keep the evidence library first; make secondary insight cards compact or move them behind enough data. | Auth visual check recommended. |
| Low | `/team` and `/team/[repId]` | `team-views.tsx:29-33` defines local shell panel classes; roster/table grids are custom at `team-views.tsx:188-249`; profile panels use local shells throughout `team-views.tsx:276-510`. | Team pages are polished but not using the same operational workspace vocabulary as Calls/Settings. | Keep the current content model, but migrate shells to Forge or operational components so Team feels like the same product surface. | Auth visual check recommended. |
| Low | Root dev error and metadata | `apps/web/app/layout.tsx:25-52` still says `description: "Revenue Command Platform"` and uses old hardcoded blue/slate error colors. | Development error state and metadata lag current "Sales Coaching Forge" language and Forge palette. | Update metadata and dev error shell to current Forge copy/tokens. | Source verification enough. |

## Whole-Product Consistency

### What Is Working

- Homepage copy clearly names the product workflows: upload/Zoom, rubric-backed scoring, coaching moments, training, roleplay, and team visibility in `landing-page.tsx:15-47`.
- Login copy now matches the actual app: `login-form.tsx:109-116` references call review, scorecards, training, and roleplay.
- Authenticated routing uses a common shell in `apps/web/app/(authenticated)/layout.tsx`.
- Many primary routes use `PageFrame`: `/dashboard`, `/upload`, `/training`, `/team`, `/highlights`, `/leaderboard`, `/notifications`, and Settings pages.
- Calls is now the clearest operational page: filters, metric strip, desktop table, mobile cards, preview drawer, and pagination are all present in `calls/page.tsx`.
- Upload has practical state design: validation, ready, uploading, complete, error, progress, and cancel/retry affordances in `upload-call-panel.tsx`.
- Settings admin flows have moved from scattered settings pages toward workspace rails and mobile-aware management tables.

### Where It Still Splits

- Public homepage, authenticated Forge pages, Calls operational workspace, Team local shells, and Training local shells still each have a recognizable visual dialect.
- `roleplay/page.tsx` does not use the same page header contract as neighboring product routes.
- Settings subpages use `ForgeWorkspaceLayout`, but the main content panels are still hand-coded repeated shells.
- Team uses Forge tokens but custom local shells and grid rows rather than the newer shared operational/table primitives.
- Root metadata still says "Revenue Command Platform" while the UI now leans on "Sales Coaching Forge" and coaching/review language.

## Information Architecture

The primary IA is understandable: Review (`Dashboard`, `Call Library`, `Upload`, `Highlights`), Coach (`Training`, `Roleplay`), People (`Team`, `Leaderboard`), plus Settings and Notifications. That organization matches the actual product workflows better than implementation-driven naming.

Risks:

- Settings and Notifications are mostly outside the visible nav groups. Settings is in the footer/account area, while Notifications is in the account menu. For admins, the people/integrations/rubric work can be a major workflow, not a secondary account detail.
- `/settings/teams` and `/settings/permissions` split related membership and manager-assignment concepts. The copy does explain the split, for example `teams-panel.tsx:710-715`, but the user must still learn where membership ends and permissions begin.
- Onboarding has create/join/invite steps, but the join path still asks for an org slug. For a new rep, an invite link is more natural than "enter your org slug".

## Workflow Usability

### Sign In And Onboarding

Strengths:

- `/login` has real disabled auth states and environment-error copy in `login-form.tsx:203-228`.
- Magic-link sent state is explicit in `login-form.tsx:211-219`.
- Invite flow covers invalid, expired, already accepted, unauthenticated, wrong account, and ready states in `invite/[token]/page.tsx:24-104`.
- Onboarding provides create org, join org, and invite teammate paths in `onboarding-panel.tsx`.

Risks:

- Decorative language/help icons in the login shell appear interactive but have no action.
- `Access Dashboard` in `login-form.tsx:179` can be slightly inaccurate when `nextPath` is an invite acceptance path.
- Onboarding invite step does not appear to offer a "done inviting" confirmation beyond "Go to Dashboard"; it works, but the completion framing is basic.

### Uploading Calls

This is one of the strongest flows in current code.

- The dropzone is keyboard accessible via `role="button"`, `tabIndex`, Enter, and Space in `upload-call-panel.tsx:228-271`.
- Status copy is practical and explicit in `upload-call-panel.tsx:40-84`.
- Progress, error, complete, and cancel/retry states are visible in `upload-call-panel.tsx:319-358`.

Remaining check: authenticated browser screenshots should verify the dropzone height, progress area, and action buttons at mobile widths.

### Reviewing Calls

Strengths:

- `/calls` has search, filters, metric strip, mobile cards, desktop table, preview drawer, and pagination.
- `/calls/[id]` has an honest media availability model in `call-detail-panel.tsx:104-157`.
- Roleplay generation uses `ForgeDialog` in `call-detail-panel.tsx:867-942`.

Risks:

- The Calls preview drawer is not actually tied to row selection.
- Call detail can dedicate too much hierarchy to unavailable playback.
- Annotation/highlight failures need visible retry/error feedback.

### Training

Strengths:

- `/training` uses `PageFrame`.
- `TrainingCourseShell` separates manager/admin rails from learner course content.
- Loading shell and stage status announce work through `aria-live`.

Risks:

- Training has the most local styling and custom modal behavior left.
- Tab roles need keyboard behavior or a simpler control pattern.
- Admin create/edit forms are dense and need tablet/mobile screenshot verification.

### Roleplay

Strengths:

- Roleplay has mobile section anchors, scenario rail, practice area, score rail, voice/text modes, transcript, scoring, and history.
- Status and error panels are present.

Risks:

- The route lacks the same `PageFrame` contract as neighboring product flows.
- Several local slate/blue surfaces remain.
- Mobile anchors need real viewport verification to ensure they do not fight the shell topbar.

### Team, People, And Admin

Strengths:

- `/team` has mobile roster cards and desktop table-like rows.
- `/settings/people`, `/settings/teams`, and `/settings/permissions` use rails, staged apply controls, mobile cards, and visible empty states.
- Invite lifecycle is real enough to send and revoke invites from Settings.

Risks:

- Admin pages are dense and repeat similar staged select/apply/remove patterns.
- People and team management use one-off field classes rather than shared field primitives.
- Rubric admin is powerful but heavy, especially with two rails plus an expanded category editor.

## Visual Hierarchy And Layout

Strongest current pages:

- `/calls`: clear operational structure and dense but organized table/card split.
- `/upload`: straightforward single workflow with practical states.
- `/settings/teams` and `/settings/people`: now structured enough to use, pending visual verification.

Weakest current pages:

- `/training`: functionally rich, visually least consolidated.
- `/roleplay`: product workflow is there, but the page contract and residual colors make it feel separate.
- `/settings/rubric`: powerful but mentally dense.
- `/highlights`: the bento cards after the list can feel like filler relative to the concrete evidence library.

Nested/over-carded risk is lower than before, but still appears in:

- `LegacyAuthShell` onboarding/invite splash cards.
- Settings editor panels with nested table/card/rail sections.
- Team local shell panels and inset panels.
- Highlights insight bento cards.

## State Design

Good state design:

- `ForgeStatusPanel`, `ForgeErrorState`, `ForgeEmptyState`, and `ForgeSkeleton` exist and are used broadly.
- Upload has ready/progress/error/success/retry/cancel states.
- Integrations disconnect has readable fallback errors and inline confirmation.
- Teams and rubrics announce busy status with `aria-live`.
- Call media state distinguishes failed, processing, no recording, no transcript, and ready.

Gaps:

- Call annotation/highlight mutations need visible error handling.
- Notifications optimistic `markOne` and `markAllRead` do not handle non-OK responses in `notifications-panel.tsx:56-80`.
- Training tab state needs stronger keyboard semantics.
- Rubric builder has validation and import warning panels, but the density may hide what blocks publish without a visual pass.

## UX Copy

Good copy:

- Landing page product language is specific and current.
- Upload state copy is practical.
- Compliance copy is appropriately explicit about recording consent.
- Invite state copy is plain and useful.
- Calls and call detail copy is honest about processing and playback availability.

Copy issues:

- "Book a demo" links to `/login`.
- "Access Dashboard" can be inaccurate for invite-return sign-ins.
- "Org ID" in account settings displays `currentUser.org.slug` in `account-panel.tsx:157-161`; if this is a slug, "Org slug" is clearer.
- Some admin copy references routes literally, such as `/settings/teams` in `permissions-panel.tsx:186-188` and `teams-panel.tsx:710-715`. It is clear for internal users but less polished than linked labels like "Teams settings".
- Root metadata still says "Revenue Command Platform".

## Responsive And Mobile Risks

Confirmed from source:

- `AuthenticatedPageContainer` provides responsive gutters and max widths.
- `ForgeManagementTable` switches to mobile cards when provided.
- `/calls` has explicit mobile cards and desktop table split.
- Dashboard skill matrix has mobile cards.
- Team roster has mobile cards.
- Settings nav is horizontal on small screens and collapsible on desktop.
- Forge workspace rails collapse to stacked layouts before large breakpoints.

Needs authenticated visual verification:

- `/settings/rubric` with two rails and expanded category forms.
- `/settings/permissions` with two management tables and staged controls.
- `/training` manager/admin forms and module player.
- `/roleplay` mobile section anchors and transcript height.
- `/calls` filters and preview drawer at tablet widths.
- `/team/[repId]` trend bars and recent-call cards.
- `/highlights` long observation text and recommendation clamp behavior.

Likely risk spots:

- Custom desktop grids such as `team-views.tsx:188-249` can become cramped at intermediate widths.
- Rubric category fields at `rubrics-panel.tsx:701-832` are dense and numerous.
- `calls-filters.tsx` uses a compact filter grid that should be checked at tablet widths.

## Accessibility Risks

What is already good:

- Shared focus ring exists in `globals.css:420-424`.
- Upload dropzone is keyboard accessible.
- Score meters use `role="progressbar"` and aria values in `forge.tsx`.
- Status panels and skeletons include live/status behavior.
- `ForgeDialog` has focus management and modal semantics.

Risks to fix/check:

- Training tablist needs arrow-key behavior if it keeps `role="tab"`.
- App shell account menu should support expected menu keyboard behavior or use simpler button/list semantics.
- Login header icons are decorative but look like controls.
- Notifications buttons do not communicate failed mutation states.
- Several controls use color-only tone differences and should be spot-checked for contrast in screenshots.
- Reduced motion covers core Forge animations, but page-local animations/transitions in Team, landing, and operational surfaces need a pass.

## Unfinished Or Half-Polished UI

- `roleplay/page.tsx` is missing the shared page header contract.
- `training-*` components remain locally styled and dialog behavior is duplicated.
- `settings/rubric` is powerful but not yet visually calm.
- `highlights/page.tsx` has leftover bento/commented-section style after the useful evidence list.
- `app/layout.tsx` dev error and metadata lag the current Forge product language.
- Login shell icons need either real actions or removal.
- Team pages are visually polished but built on local shell classes instead of the current shared operational/Forge primitives.

## Quick Wins Under 1 Hour

1. Change homepage "Book a demo" to match its real destination or point it to a real demo/contact flow.
2. Update root metadata description from "Revenue Command Platform" to current product language.
3. Replace the mobile nav `filter_list` icon with a clearer menu icon.
4. Remove or wire the login header language/help icons.
5. Rename "Org ID" to "Org slug" in account settings if the displayed value remains `currentUser.org.slug`.
6. Add visible error handling to notification mark-read mutations.
7. Make the Calls preview drawer label explicit if selection will stay `calls[0]`.
8. Replace the most obvious residual slate/blue Roleplay classes with Forge tokens.
9. Convert Training manager modal to `ForgeDialog` or document why it needs custom behavior.
10. Add a short `docs/design/forge-product-ui.md` or equivalent as a temporary design contract if `DESIGN.md` is intentionally absent.

## Larger Redesign Projects

1. **Authenticated visual verification sweep:** capture desktop, tablet, and mobile screenshots for every authenticated route with seeded org data and at least one admin user.
2. **Training consolidation:** migrate module stage, TOC, admin forms, loading shell, and manager modal to Forge primitives.
3. **Roleplay page contract:** bring Roleplay into the same `PageFrame` and operational state model without making it feel like a landing page.
4. **Rubric builder refinement:** keep the current data model, but reduce cognitive load with clearer step scoping, more compact category summaries, and sticky publish/readiness controls.
5. **Admin management primitive extraction:** share people/team/permissions staged select/apply/remove rows, field styling, status banners, and empty states.
6. **Calls preview interaction:** decide between true selected-row preview or a renamed latest/first-call summary.
7. **Design source of truth:** add a durable product/design doc that explains the current Forge metaphor, route hierarchy, state model, and mobile rules.

## Suggested Order Of Fixes For The Next 1-2 Weeks

1. Run authenticated screenshot verification first, because it may change the priority order.
2. Fix the quick CTA/copy/navigation affordance issues that can confuse users immediately.
3. Harden visible mutation failures: notifications, call notes, highlights, and admin staged changes.
4. Bring `/roleplay` onto the shared page contract and replace residual non-Forge styling.
5. Consolidate Training around Forge primitives and fix tab keyboard behavior.
6. Decide and implement Calls preview behavior.
7. Refine Settings Rubric density after seeing real screenshots.
8. Extract shared admin management primitives once People, Teams, and Permissions stabilize.
9. Clean up secondary pages: Highlights bento cards, Team local shells, Leaderboard empty/card rhythm.
10. Write the design source of truth after the above decisions are made so it documents the real direction.

## Screenshots Taken Or Routes Inspected

Screenshots taken: none.

Why: browser verification was blocked in this environment. Playwright CLI attempted to install missing packages but network access failed with `ENOTFOUND registry.npmjs.org`. Computer-use access to Chrome was denied by the local approval prompt. Shell attempts to open Chrome failed. A Next dev server did start on `127.0.0.1:3137`, but other shell commands could not connect to it, and the sandbox denied stopping the process.

Routes/components source-inspected:

- `/`
- `/login`
- `/onboarding`
- `/invite/[token]`
- `/auth/error`
- Legal pages
- `/dashboard`
- `/calls`
- `/calls/[id]`
- `/upload`
- `/highlights`
- `/training`
- `/roleplay`
- `/team`
- `/team/[repId]`
- `/leaderboard`
- `/notifications`
- `/settings`
- `/settings/people`
- `/settings/teams`
- `/settings/permissions`
- `/settings/compliance`
- `/settings/integrations`
- `/settings/rubric`
- Shared shell, Forge primitives, page frame, authenticated container, operational workspace, public landing, auth shell, upload panel, call detail panel, roleplay panel, training components, team views, settings panels.

## Commands Run And Results

| Command | Result |
|---|---|
| `git rev-parse --show-toplevel` | Confirmed repo root `/Users/thevibecodebro/Projects/argos-v2`. |
| `git branch --show-current` | `codex/operational-layout-calls`. |
| `git status --short --branch` | Dirty worktree with existing modified Calls/shell/tests and untracked operational/docs files. |
| `git worktree list` | Confirmed root worktree plus several `.codex/worktrees/*` detached worktrees. |
| `node /Users/thevibecodebro/.codex/skills/impeccable/scripts/load-context.mjs` | Returned no `PRODUCT.md` or `DESIGN.md`. |
| `find apps/web/app -maxdepth 5 -type f` | Built route inventory. |
| `rg --files apps/web/components apps/web/app/(authenticated)` | Located major UI components and moved settings/team files. |
| `nl -ba ...` and `rg -n ...` across app/components | Collected cited source evidence. |
| `npm run dev -w @argos-v2/web -- --hostname 127.0.0.1 --port 3137` | Next dev server reported ready, but cross-shell curl could not connect. |
| `curl -I http://127.0.0.1:3137/...` | Connection failed from separate shell. |
| `npx --no-install impeccable --json --fast apps/web/app apps/web/components` | Returned `[]`. |
| `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh --help` | Failed because npm registry access is blocked (`ENOTFOUND registry.npmjs.org`). |
| Computer-use Chrome inspection | Blocked by local approval denial. |
| `lsof -nP -iTCP:3137 -sTCP:LISTEN` | Shows `node` PID `64655` still listening on `127.0.0.1:3137`. |
| `kill -TERM 64655` | Failed with `operation not permitted`; dev server may still be running. |

## Things Not Checked And Why

- Authenticated visual screenshots: blocked by browser/tool access and auth environment.
- Real keyboard walkthrough: blocked by lack of browser access.
- Real mobile screenshots: blocked by lack of browser access.
- Real production or preview URL: not requested and not needed for a repo-source audit.
- Live seeded data quality: no authenticated database/session was available in this run.
- Performance metrics: outside the requested UX/UI audit scope.
- Automated test suite: not run because this was a report-only audit with no app-code changes; existing tests were source-inspected where relevant.
