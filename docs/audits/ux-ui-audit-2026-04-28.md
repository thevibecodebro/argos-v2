# Argos UX/UI Audit

Date: 2026-04-28  
Repo audited: `/Users/thevibecodebro/Projects/argos-v2`  
Branch: `main`  
HEAD: `5583f18860269d94993c1c8168c7412bd145d6a3`  
Audit mode: source inspection, route/component inventory, targeted UI tests, and attempted local visual verification. No product code changes were made.

## Executive Summary

Argos is now much closer to a single coherent product than the earlier audit snapshot. The current implemented visual source of truth is the warm dark "forge" system: ember/gold/cyan accents, compact operational panels, a collapsible authenticated rail, shared forge surfaces, mobile table cards, and product language centered on turning sales calls into coaching, training, and roleplay.

The biggest UX risk is no longer that the whole app is blue/cyan or that the authenticated shell is desktop-only. Those issues have been materially improved in the current code. The remaining problems are edge migration and workflow polish: `/login` and `/onboarding` still use the old blue split-screen shell and stale logistics copy; several authenticated top-level routes still use desktop-heavy `px-12` or `p-8` wrappers; roleplay is visually ambitious but dense on smaller screens; call detail shows a media-style preview even when no media is linked; and modal/focus behavior still needs a real keyboard pass.

The strongest current surfaces are the public homepage, authenticated app shell, calls list, upload flow, team list, and permissions tables. They now share a forge vocabulary and have better state design than the previous audit captured. The weakest surfaces are pre-auth onboarding, roleplay, parts of call detail, dashboard tables, and the lingering duplicate CSS/source-of-truth debt in `globals.css`.

Live browser screenshots could not be captured in this sandbox. The Next dev server failed with `listen EPERM` on `127.0.0.1:3117`, and no browser-use tool was exposed in this run. Authenticated visual layout checks are therefore marked as needing live verification.

## Repo State Checked First

- Root audited: `/Users/thevibecodebro/Projects/argos-v2`
- Current branch: `main`
- Current HEAD: `5583f18860269d94993c1c8168c7412bd145d6a3`
- Worktrees:
  - `/Users/thevibecodebro/Projects/argos-v2` at `5583f18 [main]`
  - `/Users/thevibecodebro/.codex/worktrees/c3d6/argos-v2` at `5583f18 [security/codebase-risk-remediation]`
- Git status before report update:
  - `## main...origin/main`
  - untracked `docs/audits/`
  - untracked `docs/design/authenticated-forge-ux-audit.local-before-pr9.md`
  - untracked `docs/superpowers/plans/2026-04-27-highlevel-inspired-authenticated-argos-implementation.md`
- This report updates `docs/audits/ux-ui-audit-2026-04-28.md`.

## Actual Visual Source Of Truth

Current implemented source of truth:

- Forge tokens: `apps/web/app/globals.css:3-42`
- Authenticated forge shell primitives: `apps/web/app/globals.css:75-193`
- Forge responsive workspace/table/skeleton primitives: `apps/web/app/globals.css:205-346`, `apps/web/app/globals.css:359-784`
- Public homepage structure and pricing: `apps/web/components/public/landing-page.tsx:49-99`
- Public homepage hero copy: `apps/web/components/public/landing-page.tsx:132-156`
- Homepage 3D/forge styling: `apps/web/app/globals.css:1684-1708`, `apps/web/app/globals.css:2297-2424`, `apps/web/app/globals.css:2485-2580`, `apps/web/app/globals.css:2688-2777`, `apps/web/app/globals.css:2901-3075`
- Authenticated app shell/mobile rail/top bar: `apps/web/components/app-shell.tsx:80-160`, `apps/web/components/app-shell.tsx:245-430`
- Shared forge primitives: `apps/web/components/forge.tsx:194-259`, `apps/web/components/forge.tsx:407-549`, `apps/web/components/forge.tsx:633-720`

Current visual language:

- Near-black forge background with warm surface layers: `#050403`, `#100907`, `#17100c`, `#20150f`
- Product text in warm off-white: `#fff4e6`
- Gold/ember/cyan accents: `#f1bf7b`, `#ff9f5f`, `#88daf7`
- Compact operational surfaces, rails, chips, skeletons, tables, mobile cards, and page frames
- Public homepage is expressive and 3D-forward; authenticated pages are denser and workflow-focused

Important correction from the previous report:

- The earlier report described a blue/cyan authenticated shell as current. That is stale for HEAD `5583f18`. The current authenticated shell is forge-based and includes a mobile drawer and collapsible desktop rail in `apps/web/components/app-shell.tsx:80-160`.

## Route And Page Inventory

| Route | Source | Current UX/UI status |
| --- | --- | --- |
| `/` | `apps/web/app/page.tsx`, `apps/web/components/public/landing-page.tsx` | Strongest public brand expression. Uses 3D forge homepage and current Solo/Team pricing. Needs visual asset/runtime verification. |
| `/login` | `apps/web/app/login/page.tsx`, `apps/web/components/legacy-shell.tsx`, `apps/web/components/auth/login-form.tsx` | Uses legacy blue split-screen shell. Copy includes stale "global logistics operations"; footer/form links use `href="#"`. |
| `/onboarding` | `apps/web/app/onboarding/page.tsx`, `apps/web/components/onboarding-panel.tsx` | Org create/join/invite flow exists, but styling is legacy blue and disconnected from forge. |
| `/invite/[token]` | `apps/web/app/invite/[token]/page.tsx` | Handles invalid, expired, accepted, unauthenticated, wrong-account, and ready states. Needs visual verification. |
| `/privacy-policy` | `apps/web/app/privacy-policy/page.tsx` | Public legal page. Needs visual verification against homepage/pre-auth chrome. |
| `/terms-of-service` | `apps/web/app/terms-of-service/page.tsx` | Public legal page. Needs visual verification against homepage/pre-auth chrome. |
| `/security-policy` | `apps/web/app/security-policy/page.tsx` | Public legal page. Needs visual verification against homepage/pre-auth chrome. |
| `/auth/error` | `apps/web/app/auth/error/page.tsx` | Auth error route. Needs visual verification. |
| `/dashboard` | `apps/web/app/(authenticated)/dashboard/page.tsx` | Forge content, but wrapper is `px-12` and skill matrix uses a desktop table with horizontal overflow. |
| `/calls` | `apps/web/app/(authenticated)/calls/page.tsx`, `apps/web/app/(authenticated)/calls/calls-filters.tsx` | Good current list pattern. Has mobile cards and shared table shell. Filter reset is covered by tests. |
| `/calls/[id]` | `apps/web/app/(authenticated)/calls/[id]/page.tsx`, `apps/web/components/call-detail-panel.tsx` | Core review workbench. Forge styling is present, but media preview, internal ID chips, transcript emphasis, and modal semantics need polish. |
| `/upload` | `apps/web/app/(authenticated)/upload/page.tsx`, `apps/web/components/upload-call-panel.tsx` | Strong practical states: ready/progress/error/disabled. Validation now uses shared contract helper. |
| `/highlights` | `apps/web/app/(authenticated)/highlights/page.tsx` | Forge-framed ledger with empty state. Lower bento cards feel less finished and may duplicate status information. |
| `/roleplay` | `apps/web/app/(authenticated)/roleplay/page.tsx`, `apps/web/components/roleplay-panel.tsx` | Functional simulation surface, but two-rail layout, fixed transcript height, hidden scrollbar, and desktop table need mobile/tablet work. |
| `/training` | `apps/web/app/(authenticated)/training/page.tsx`, `apps/web/components/training-panel.tsx`, `apps/web/components/training/*` | Stronger state depth than most pages. Manager mode has multi-rail density risk. |
| `/leaderboard` | `apps/web/app/(authenticated)/leaderboard/page.tsx` | Authenticated ranking view. Needs live visual verification and mobile check. |
| `/notifications` | `apps/web/app/(authenticated)/notifications/page.tsx`, `apps/web/components/notifications-panel.tsx` | Notification center. Needs live visual verification. |
| `/team` | `apps/web/app/(authenticated)/team/page.tsx`, `apps/web/components/team/team-views.tsx` | Positive example: mobile cards and desktop rows are intentionally separate. |
| `/team/[repId]` | `apps/web/app/(authenticated)/team/[repId]/page.tsx`, `apps/web/components/team/team-views.tsx` | Rep detail route. Needs authenticated visual verification. |
| `/settings` | `apps/web/app/(authenticated)/settings/page.tsx`, `apps/web/app/(authenticated)/settings/layout.tsx` | Settings shell has a local settings rail. Usable, but may feel nested beside the global app rail on tablet. |
| `/settings/people` | `apps/web/app/(authenticated)/settings/people/page.tsx` | People management. Needs live visual verification. |
| `/settings/teams` | `apps/web/app/(authenticated)/settings/teams/page.tsx` | Teams management. Needs live visual verification. |
| `/settings/permissions` | `apps/web/app/(authenticated)/settings/permissions/page.tsx`, `apps/web/components/settings/permissions-panel.tsx` | Good table/mobile-card implementation with shared forge management pattern. |
| `/settings/integrations` | `apps/web/app/(authenticated)/settings/integrations/page.tsx` | Integration configuration. Needs live visual verification. |
| `/settings/rubric` | `apps/web/app/(authenticated)/settings/rubric/page.tsx` | Rubric settings. Needs live visual verification. |
| `/settings/compliance` | `apps/web/app/(authenticated)/settings/compliance/page.tsx` | Compliance settings. Needs live visual verification. |

## Top 10 UX/UI Issues Ranked By User Impact

1. **Pre-auth routes still look like a different product.** `/login` and `/onboarding` use legacy blue surfaces and copy. Evidence: `apps/web/components/legacy-shell.tsx:12-16`, `apps/web/components/legacy-shell.tsx:61-66`, `apps/web/components/onboarding-panel.tsx:73-168`.

2. **Several authenticated pages still use desktop-heavy page padding.** Dashboard and training use `px-12`; roleplay uses `p-8`. This can consume too much width on 390px mobile before content even renders. Evidence: `apps/web/app/(authenticated)/dashboard/page.tsx:67`, `apps/web/app/(authenticated)/training/page.tsx:39`, `apps/web/app/(authenticated)/roleplay/page.tsx:45`.

3. **Roleplay is the highest-risk authenticated workflow on mobile.** It uses a two-rail workspace, a fixed `h-[480px]` transcript, hidden scrollbar, a voice/text control that is not a true segmented mode, and a recent-history table without the newer mobile-card pattern. Evidence: `apps/web/components/roleplay-panel.tsx:479-596`, `apps/web/components/roleplay-panel.tsx:790-852`.

4. **Call detail shows fake media affordances when no media is linked.** The workbench always renders a play button/progress preview, then labels the state "No media linked." Users may expect audio/video playback that does not exist. Evidence: `apps/web/components/call-detail-panel.tsx:399-450`.

5. **The Generate Roleplay modal lacks dialog semantics and likely focus management.** The overlay is a fixed div with no `role="dialog"`, no `aria-modal`, no visible focus trap, and no Escape handling in the inspected code. Evidence: `apps/web/components/call-detail-panel.tsx:756-837`.

6. **Dashboard still has a desktop-first skill matrix.** The Rep Skill Matrix uses `min-w-[760px]` inside `overflow-x-auto`, not a mobile card or priority-column fallback. Evidence: `apps/web/app/(authenticated)/dashboard/page.tsx:355-415`.

7. **Multi-rail surfaces may become cramped at tablet widths.** Roleplay uses bookend rails; training manager and settings add secondary rails inside the global app shell. CSS stacks workspace rails below 56rem, but tablet breakpoints need real visual proof. Evidence: `apps/web/components/forge.tsx:633-720`, `apps/web/app/globals.css:205-346`, `apps/web/app/(authenticated)/settings/layout.tsx:20-33`.

8. **The codebase still contains old visual systems beside the new forge source of truth.** Legacy auth uses blue inline colors, and old `.landing-page` CSS remains in `globals.css` while the current homepage uses `.argos-3d-page`. Evidence: `apps/web/components/legacy-shell.tsx:12-66`, `apps/web/components/onboarding-panel.tsx:73-168`, `apps/web/app/globals.css:883-1038`, `apps/web/app/globals.css:1684-1708`.

9. **Highlights has improved framing but still feels half-polished below the main list.** The route has a useful status band and ledger, then extra bento cards for "Weekly Coaching Insights" and "Intelligence Health" that can read as filler when data is sparse. Evidence: `apps/web/app/(authenticated)/highlights/page.tsx:42-70`, `apps/web/app/(authenticated)/highlights/page.tsx:153-216`.

10. **Focus states and keyboard paths need a whole-product pass.** There are good examples, but forge buttons, modal overlays, hidden scrollbars, and table-row overlay links should be tested end to end with keyboard and reduced motion. Evidence: `apps/web/app/globals.css:1710-1713`, `apps/web/app/globals.css:773-784`, `apps/web/components/call-detail-panel.tsx:756-837`, `apps/web/components/roleplay-panel.tsx:593-596`.

## Findings Table

| Severity | Page/flow | Evidence | User impact | Recommended fix | Verification needed |
| --- | --- | --- | --- | --- | --- |
| High | `/login` and `/onboarding` | `legacy-shell.tsx:12-66`; `onboarding-panel.tsx:73-168` | First-run users see a blue logistics command center before entering the warm sales-coaching app. Trust and product continuity suffer. | Migrate pre-auth shell and onboarding panels to forge tokens and update stale copy/links. Preserve the create/join/invite workflow. | Desktop/mobile visual pass plus auth smoke test. |
| High | Authenticated page wrappers | `dashboard/page.tsx:67`; `training/page.tsx:39`; `roleplay/page.tsx:45` | Mobile users lose 64-96px of horizontal space before cards, tables, or forms render. | Standardize route wrappers on `px-4 sm:px-6 lg:px-8` or a shared authenticated page container. | 390px, 768px, 1440px screenshots for dashboard, training, roleplay. |
| High | `/roleplay` simulation | `roleplay-panel.tsx:479-596`; `roleplay-panel.tsx:790-852` | The highest-interaction coaching workflow can feel cramped, scroll-obscured, and table-heavy on small screens. | Convert Recent History to `ForgeManagementTable` mobile cards, make transcript height viewport-aware, expose scrollbar/fade, and simplify mobile rail behavior. | Authenticated mobile/tablet interaction test. |
| High | `/calls/[id]` media workbench | `call-detail-panel.tsx:399-450` | A play button and fake progress suggest playback even when the UI says no media is linked. | Render a true empty media state when no playback asset exists; only show controls when media is available. | Source test plus visual check with calls with/without media. |
| High | `/calls/[id]` Generate Roleplay modal | `call-detail-panel.tsx:756-837` | Screen reader and keyboard users may not get proper modal context, focus return, or Escape close. | Add dialog semantics, labelled heading, focus trap/initial focus, Escape close, and focus return. | Keyboard-only and screen-reader smoke pass. |
| Medium | `/dashboard` matrix | `dashboard/page.tsx:355-415` | Horizontal scrolling hides key coaching signals on mobile and makes manager scanning harder. | Use mobile cards or a summary-first layout with expandable skill detail. | Mobile screenshot with sample manager data. |
| Medium | Settings/training multi-rail flows | `settings/layout.tsx:20-33`; `training-course-shell.tsx:20-60`; `forge.tsx:633-720` | Dense nested rails can crowd content, especially between mobile and desktop breakpoints. | Keep rails, but verify stacking order and collapse behavior; consider one horizontal subnav for settings on tablet. | Authenticated screenshots at 768px and 1024px. |
| Medium | Source-of-truth drift | `globals.css:883-1038`; `globals.css:1684-1708`; `authenticated-forge-token-coverage.test.ts:7-79` | Developers can accidentally revive old blue components or judge against stale CSS. | Remove or clearly quarantine unused legacy landing styles; extend token coverage to pre-auth and onboarding. | Run token coverage and compare `/`, `/login`, `/onboarding`. |
| Medium | `/highlights` lower panels | `highlights/page.tsx:153-216` | Sparse-data users may see repeated "No data yet" style cards rather than one clear next action. | Make the ledger the primary experience; collapse lower diagnostics until there is useful data. | Empty, partial, and populated state screenshots. |
| Medium | Calls row affordance | `calls/page.tsx:89-181`; `calls/page.tsx:180-242` | The list is strong, but table rows should stay navigable and non-conflicting as actions are added. | Keep mobile cards; ensure desktop row link and future row actions have clear keyboard/focus order. | Keyboard navigation through `/calls`. |
| Medium | Call detail top chips/actions | `calls/[id]/page.tsx:60-81` | `#{id}` and "Share Insight" can feel internal or misleading if it only routes to highlights. | Replace raw ID with user-meaningful metadata; rename or implement the action so the label matches the result. | Visual check with real call data. |
| Medium | Roleplay mode control | `roleplay-panel.tsx:561-574` | Voice is interactive but Text is a static label, which implies a mode switch that is not actually available. | Make this a true segmented control, or remove the static Text pill until there is a text/voice toggle. | Interaction test in active and inactive sessions. |
| Low | Upload flow | `upload-call-panel.tsx:7-13`; `upload-call-panel.tsx:50-58`; `upload-contract.ts:60-70` | The flow is now much better; remaining risk is visual verification of disabled/progress/error states. | Keep shared validation; add screenshot/story coverage for ready/progress/error/partial failure. | Upload UI screenshots or component tests. |
| Low | Team list | `team-views.tsx:133-179`; `team-views.tsx:181-245` | Positive pattern worth copying to dashboard and roleplay tables. | Treat this as the mobile/list fallback reference implementation. | Verify with long names and empty team. |
| Low | Reduced-motion consistency | `globals.css:773-784`; `globals.css:3052-3075` | Public and forge areas include reduced-motion handling, but route-specific animations still need audit. | Keep reduced-motion CSS and check interactive areas with OS reduce-motion enabled. | Browser pass with reduced motion. |

## Whole-Product Consistency

What is working now:

- The public homepage and authenticated shell now share a warmer forge mood rather than two completely unrelated palettes.
- The authenticated shell has a grouped product IA: Review, Coach, People, and System. That is more user-intent oriented than a flat implementation list.
- Calls, team, permissions, and parts of settings use shared forge management/table primitives instead of one-off table styling.
- The upload flow is practical: accepted file rules, progress copy, disabled states, and error feedback are handled in the component and shared contract.
- Test coverage exists for important recent consistency work: app shell navigation, calls filter reset, upload validation, roleplay markup, primary route hero removal, and forge token coverage.

Where consistency breaks:

- `/login` and `/onboarding` are still visually from the old blue product system.
- Legacy public `.landing-page` CSS remains beside the current `.argos-3d-page` homepage CSS, which makes source-of-truth discovery harder.
- Several routes still own their own outer spacing instead of using one shared authenticated route container.
- Roleplay has the right forge ingredients, but it feels like a special-case chat/simulation cockpit rather than the same management system used in calls/team/settings.
- Dashboard and highlights still contain older patterns that are functional but less decisive than the newer calls/team/settings surfaces.

## Information Architecture

The primary authenticated route names are understandable: Dashboard, Calls, Upload, Highlights, Roleplay, Training, Leaderboard, Notifications, Team, and Settings. The grouped app shell also helps users orient by intent.

The strongest IA choice is that the core path is now visible: upload a call, review it in calls, turn findings into highlights/training/roleplay, then manage people and settings. The product should continue to reinforce that loop.

IA risks:

- `Share Insight` on call detail routes users to `/highlights`, but the label sounds like a share/export action. The outcome should match the label.
- The login shell's "global logistics operations" copy contradicts the sales coaching product model.
- Roleplay has personas, generated sessions, voice, transcript, scoring, and history on one screen. The workflow is real, but the hierarchy should more clearly say: choose scenario, practice, review score, continue training.
- Settings has many useful sections, but two levels of navigation can feel like a nested admin tool inside an already rail-based product. The mobile horizontal settings nav is a good direction; tablet needs proof.

## Workflow Usability

Sign in/onboarding:

- `/login` works as an entry point but is off-brand and has placeholder footer/form links.
- `/onboarding` supports create, join, and invite paths, but the visual design and copy do not match the current app. This is the most important first-run UX cleanup.

Creating or joining an org:

- `onboarding-panel.tsx` has a clear choose/create/join/invite structure.
- Error placement exists, but it uses legacy red/blue styling and needs visual verification for long errors.
- Join by slug is functional, but the UI does not explain where a user finds the slug or what to do if they expected an invite.

Uploading calls:

- `upload-call-panel.tsx` now uses shared validation from `upload-contract.ts`, including extension fallback.
- The route has explicit ready/progress/error states instead of a generic spinner-only pattern.
- Remaining work is mostly screenshot/state coverage and verifying the final success handoff to calls/call detail.

Reviewing and filtering calls:

- `/calls` is now one of the best current product surfaces: filters are isolated, empty states are action-oriented, desktop and mobile list patterns both exist.
- The filter reset behavior is covered by `lib/calls-filters-forge.test.tsx`.
- The call detail page is useful but less honest in its media preview and less accessible in the generated-roleplay modal.

Assigning training:

- Training uses a learner/manager split and ARIA tab patterns in the module stage.
- Manager training has real workflow depth, but the two-rail layout needs tablet verification.

Practicing roleplay:

- Roleplay has meaningful states: persona selection, generated-from-call sessions, active voice practice, transcript, scoring, and history.
- The screen tries to do too much at once on small viewports. The rails, fixed transcript, bottom composer, and history table should be rationalized around the next action.

Managing team access:

- `/team` is a good reference for list-heavy responsive behavior. Mobile cards and desktop rows are separate rather than forcing a table onto mobile.
- Team detail needs authenticated visual verification.

Configuring integrations and changing settings:

- Settings sections exist and are named plainly.
- Permissions uses a stronger shared management table/mobile-card system.
- The local settings nav should be verified at 768px and 1024px because it sits inside the global shell.

## Visual Hierarchy And Layout

The product's best pages use a clear hierarchy: page frame, status strip, primary table/list, then secondary panels. `/calls`, `/team`, `/settings/permissions`, and `/upload` are the clearest examples.

The weaker pages either over-densify the surface or imply interactions that are not ready:

- `/roleplay` has two rails plus central transcript plus controls plus scorecard plus history.
- `/dashboard` has useful manager data, but the skill matrix is still a desktop table in an otherwise modern shell.
- `/calls/[id]` has a strong workbench concept, but the fake media preview competes with the actual call review/transcript content.
- `/highlights` has a good primary ledger, but lower summary cards can read as filler when data is absent.

Avoid turning authenticated pages into landing pages. The right direction is the current compact operational forge style, not oversized heroes. The test `primary-route-hero-removal.test.ts` is aligned with that direction.

## State Design

Strong current states:

- Upload ready/progress/error/disabled states in `upload-call-panel.tsx`
- Calls empty state with either "Clear filters" or "Upload a call" depending on filter context in `calls/page.tsx:161-175`
- Forge skeleton/loading primitive in `forge.tsx`
- Team mobile card states in `team-views.tsx`
- Training tabs and manager/learner branches

State gaps:

- Call detail media state shows playback UI even when no media exists.
- Generate Roleplay modal loading/error states exist, but modal semantics and focus behavior are not complete.
- Roleplay voice starting/active states exist, but the Voice/Text control reads like a mode selector when only Voice is a button.
- Highlights sparse-data states need one clearer next action rather than several low-information panels.
- Pre-auth onboarding errors and invite/join edge states need forge visual treatment.

## UX Copy

Copy to preserve:

- Public homepage positioning around turning sales calls into practice plans.
- "Calls", "Training", "Roleplay", "Highlights", "Team", and "Settings" as core product language.
- Practical upload and calls empty-state copy.

Copy to fix:

- `legacy-shell.tsx:61-66` says "global logistics operations," which is not this product.
- `legacy-shell.tsx:92-112` footer legal links are placeholders.
- `auth/login-form.tsx` still contains placeholder links in the form footer.
- `calls/[id]/page.tsx:75-81` uses "Share Insight" for a route to `/highlights`; the action should be named for the result.
- Roleplay's static "Text" pill should either become real mode copy or be removed.

## Responsive And Mobile Risks

Routes with current positive responsive patterns:

- `/calls`: `ForgeManagementTable` plus mobile cards in `calls/page.tsx:89-179`
- `/team`: mobile cards and desktop rows in `team-views.tsx:133-245`
- `/settings/permissions`: shared management tables with mobile cards in `permissions-panel.tsx`
- App shell: mobile nav overlay and close behavior in `app-shell.tsx:80-160`

Routes needing mobile/tablet verification:

- `/dashboard`: `px-12` wrapper and `min-w-[760px]` matrix
- `/training`: `px-12` wrapper plus manager two-rail layout
- `/roleplay`: `p-8` wrapper, two rails, fixed transcript, hidden scrollbar, table history
- `/settings/*`: global rail plus settings rail
- `/calls/[id]`: dense call review workbench and modal
- `/leaderboard` and `/notifications`: source inspected through route inventory, but not visually verified

Recommended responsive baseline:

- Standardize authenticated route padding to `px-4 sm:px-6 lg:px-8`.
- Prefer `ForgeManagementTable` mobile cards for any data grid a user must understand on a phone.
- Treat 390px, 768px, 1024px, and 1440px as required screenshots for the next pass.

## Accessibility Risks

Positive signs:

- Homepage focus-visible styling exists in `globals.css:1710-1713`.
- Forge reduced-motion handling exists in `globals.css:773-784`.
- Homepage reduced-motion handling exists in `globals.css:3052-3075`.
- App nav uses active state semantics and labels in `app-shell.tsx`.
- Training module tabs use ARIA roles in `training-module-stage.tsx:63-106`.

Risks:

- The Generate Roleplay modal does not expose dialog semantics or focus management in inspected code.
- Hidden scrollbars in roleplay reduce discoverability for keyboard and mouse users.
- Forge buttons and custom row patterns need a visible focus pass in-browser, not just source inspection.
- Table-row overlay links can become fragile if row actions are added later.
- Icon-only controls generally need tooltip/label verification across app shell, call detail, notes, and settings.
- Reduced motion should be checked with OS/browser preference enabled because homepage and shell use transitions and 3D effects.

## Frontend Implementation Risks Affecting UX

- Multiple visual systems still exist: legacy auth, leftover old landing CSS, forge app primitives, and route-specific hardcoded styles.
- Several routes hardcode outer layout spacing instead of using one shared authenticated container.
- Roleplay mixes data fetching/mutation state, simulation layout, transcript rendering, voice controls, scoring, modal launch, and history in one large component. That increases UI regression risk.
- Dashboard still uses older local `SurfacePanel` patterns beside newer forge primitives.
- Token coverage tests are useful but should include pre-auth/onboarding or explicitly document that they are excluded.
- Existing tests are good for markup/source guarantees but do not replace browser screenshots for 390px/768px/tablet layout.

## Unfinished Or Half-Polished UI

- `/login`: old visual system, stale copy, placeholder links.
- `/onboarding`: old visual system and limited guidance for join-by-slug.
- `/roleplay`: dense layout, hidden scrollbar, static Text pill, table history.
- `/calls/[id]`: fake media preview, raw ID/profile chips, modal accessibility.
- `/dashboard`: desktop skill matrix inside forge app.
- `/highlights`: useful ledger plus lower panels that need stronger empty/populated behavior.
- Legacy CSS in `globals.css`: old `.landing-page` section remains beside current `.argos-3d-page`.

## Quick Wins Under 1 Hour

- Replace the login shell's stale logistics copy with current sales-coaching language.
- Replace placeholder auth footer/form links with real legal routes or remove them.
- Change dashboard/training/roleplay outer padding to responsive app padding.
- Remove the call-detail play button/progress bar when there is no linked media.
- Rename "Share Insight" or make it actually share/export.
- Add `role="dialog"`, `aria-modal`, labelled heading, Escape close, and focus return to Generate Roleplay.
- Convert roleplay Recent History to `ForgeManagementTable` mobile cards or add an immediate mobile-card fallback.
- Make the roleplay transcript scrollbar discoverable.
- Add `/login` and `/onboarding` to a pre-auth token/style coverage test.
- Mark old `.landing-page` CSS as legacy or remove it after confirming no current component uses it.

## Larger Redesign Projects

1. **Pre-auth forge migration.** Bring `/login`, `/onboarding`, and invite states into the same forge visual system while preserving the create/join/invite workflow.

2. **Roleplay simulation workspace.** Redesign around a clear sequence: choose scenario, practice, review score, continue training. Keep the existing personas/sessions/data model.

3. **Call detail workbench hardening.** Make media, transcript, coaching moments, notes, and generated roleplay feel like one review workflow rather than separate panels.

4. **Dashboard manager mobile redesign.** Replace the skill matrix with mobile summaries and a drill-in pattern.

5. **Settings/training tablet pass.** Verify and refine multi-rail layouts between mobile and desktop.

6. **Design-source cleanup.** Consolidate old landing/auth CSS, expand token coverage, and document forge as the current source of truth.

7. **Authenticated visual regression harness.** Add fixture-backed screenshots for the primary authenticated routes at desktop/tablet/mobile widths.

## Suggested Order Of Fixes For The Next 1-2 Weeks

Week 1:

1. Fix pre-auth copy and placeholder links.
2. Standardize authenticated route padding on dashboard, training, and roleplay.
3. Remove misleading call-detail media controls when no media is available.
4. Add modal accessibility semantics/focus handling to Generate Roleplay.
5. Add roleplay Recent History mobile fallback and visible transcript scroll affordance.
6. Run the existing targeted UI tests after each change.

Week 2:

1. Migrate `/login` and `/onboarding` to forge visual treatment.
2. Rework roleplay into a more responsive simulation workflow.
3. Replace dashboard skill matrix mobile behavior.
4. Verify settings/training multi-rail layouts at 768px and 1024px.
5. Remove or quarantine legacy `.landing-page` CSS.
6. Add browser screenshot coverage for `/`, `/login`, `/onboarding`, `/dashboard`, `/calls`, `/calls/[id]`, `/upload`, `/roleplay`, `/training`, `/team`, and `/settings/permissions`.

## Screenshots Taken Or Routes Inspected

Screenshots captured:

- None. Local browser verification was blocked in this environment.

Routes/components inspected from source:

- `/`: `apps/web/components/public/landing-page.tsx`, homepage sections and current `.argos-3d-page` CSS
- `/login`: `apps/web/app/login/page.tsx`, `components/legacy-shell.tsx`, `components/auth/login-form.tsx`
- `/onboarding`: `apps/web/app/onboarding/page.tsx`, `components/onboarding-panel.tsx`
- `/invite/[token]`: `apps/web/app/invite/[token]/page.tsx`
- `/dashboard`: `apps/web/app/(authenticated)/dashboard/page.tsx`
- `/calls`: `apps/web/app/(authenticated)/calls/page.tsx`, `apps/web/app/(authenticated)/calls/calls-filters.tsx`
- `/calls/[id]`: `apps/web/app/(authenticated)/calls/[id]/page.tsx`, `components/call-detail-panel.tsx`
- `/upload`: `apps/web/app/(authenticated)/upload/page.tsx`, `components/upload-call-panel.tsx`, `lib/upload-contract.ts`
- `/highlights`: `apps/web/app/(authenticated)/highlights/page.tsx`
- `/roleplay`: `apps/web/app/(authenticated)/roleplay/page.tsx`, `components/roleplay-panel.tsx`
- `/training`: `apps/web/app/(authenticated)/training/page.tsx`, `components/training/*`
- `/team`: `apps/web/app/(authenticated)/team/page.tsx`, `components/team/team-views.tsx`
- `/settings/*`: settings routes, layout, nav, and permissions panel
- Shared chrome/primitives: `components/app-shell.tsx`, `components/forge.tsx`, `app/globals.css`

Routes needing authenticated visual verification:

- `/dashboard`
- `/calls`
- `/calls/[id]`
- `/upload`
- `/highlights`
- `/roleplay`
- `/training`
- `/leaderboard`
- `/notifications`
- `/team`
- `/team/[repId]`
- `/settings`
- `/settings/people`
- `/settings/teams`
- `/settings/permissions`
- `/settings/integrations`
- `/settings/rubric`
- `/settings/compliance`

## Commands Run And Results

- `git -C /Users/thevibecodebro/Projects/argos-v2 status --short --branch`
  - Result: `## main...origin/main` with untracked `docs/audits/`, `docs/design/authenticated-forge-ux-audit.local-before-pr9.md`, and `docs/superpowers/plans/2026-04-27-highlevel-inspired-authenticated-argos-implementation.md`.

- `git -C /Users/thevibecodebro/Projects/argos-v2 rev-parse HEAD && git -C /Users/thevibecodebro/Projects/argos-v2 branch --show-current`
  - Result: HEAD `5583f18860269d94993c1c8168c7412bd145d6a3`, branch `main`.

- `git -C /Users/thevibecodebro/Projects/argos-v2 worktree list`
  - Result: root repo at `5583f18 [main]`; automation worktree at `5583f18 [security/codebase-risk-remediation]`.

- `node /Users/thevibecodebro/.codex/skills/impeccable/scripts/load-context.mjs`
  - Result: no root `PRODUCT.md` or `DESIGN.md` found, so the audit used current code as the design source of truth.

- `npm run dev:web -- --hostname 127.0.0.1 --port 3117`
  - Result: failed because the extra args were interpreted as a project directory by the root script.

- `npm --workspace @argos-v2/web run dev -- --hostname 127.0.0.1 --port 3117`
  - Result: failed with `listen EPERM: operation not permitted 127.0.0.1:3117`; no live screenshots captured.

- Browser-use tool discovery
  - Result: no callable browser-use tool was exposed in this run.

- `npm run test:web -- --run apps/web/lib/authenticated-forge-token-coverage.test.ts apps/web/lib/app-shell.test.ts apps/web/lib/calls-filters-forge.test.tsx apps/web/lib/upload-call-panel.test.tsx apps/web/lib/roleplay-panel.test.ts apps/web/lib/primary-route-hero-removal.test.ts`
  - Result: failed to find files because the web workspace runs Vitest from `apps/web` and the paths were root-prefixed.

- `npm run test -w @argos-v2/web -- --run lib/authenticated-forge-token-coverage.test.ts lib/app-shell.test.ts lib/calls-filters-forge.test.tsx lib/upload-call-panel.test.tsx lib/roleplay-panel.test.ts lib/primary-route-hero-removal.test.ts`
  - Result: passed. 6 test files, 21 tests.

## Things Not Checked And Why

- Live desktop/tablet/mobile screenshots were not captured because the dev server could not bind to localhost in this sandbox.
- Authenticated visual flows were not clicked through because no live browser target was available.
- Real media playback was not verified because source inspection showed no reliable playable media state and browser verification was blocked.
- Real org/invite creation was not executed because this was an audit-only run and should not mutate product data.
- Screen-reader output was not verified; accessibility findings are based on source inspection and should be validated in-browser.
- Production deployment was not checked; this report is repo-grounded against local HEAD `5583f18`.

