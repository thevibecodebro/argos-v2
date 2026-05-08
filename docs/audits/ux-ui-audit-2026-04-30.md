# Argos UX/UI Audit - 2026-04-30

Audit target: `/Users/thevibecodebro/Projects/argos-v2`

Branch/worktree checked:

- Target repo: `/Users/thevibecodebro/Projects/argos-v2`
- Branch: `main`
- HEAD: `a925786efeaaf7012ad8d16bd825f067f3569e5f`
- Worktree list: target repo on `main`; automation worktree `/Users/thevibecodebro/.codex/worktrees/2c8b/argos-v2` at detached `a925786`
- Pre-existing status before this report: untracked `docs/audits/`, `docs/design/authenticated-forge-ux-audit.local-before-pr9.md`, and `docs/superpowers/plans/2026-04-27-highlevel-inspired-authenticated-argos-implementation.md`

## Executive Summary

Argos is much more coherent than the older blue/cyan version, but it is not yet one fully unified product. The current source of truth is the warm Forge system in `apps/web/app/globals.css`, `apps/web/components/forge.tsx`, `apps/web/components/app-shell.tsx`, `apps/web/components/page-frame.tsx`, and the current 3D homepage in `apps/web/components/public/landing-page.tsx`. Calls, team, many settings pages, and upload mostly follow that system. Login, onboarding, invite, legal pages, dashboard, roleplay, call detail, and the rubric builder still show visible seams.

The highest-impact work is not another broad redesign. It is finishing migration to the Forge system on the exact routes users hit first or use repeatedly: `/login`, `/onboarding`, `/invite/[token]`, `/dashboard`, `/roleplay`, `/calls/[id]`, `/settings/rubric`, and integrations disconnect/error handling.

No live screenshots were captured this run. A Next dev server started successfully, but this sandbox could not connect back to `127.0.0.1:3129`; browser-use tools were unavailable; Playwright attempted to fetch `@playwright/cli` from npm and failed because network access is restricted. Authenticated routes therefore need real visual verification in a browser session.

## Visual Source Of Truth

Current product visual language:

- Forge tokens live in `apps/web/app/globals.css:3-42`: warm dark base, forge gold, ember, cyan, danger, success.
- Shared authenticated chrome lives in `apps/web/components/app-shell.tsx:131-360`: grouped left nav, Forge topbar, upload action, notifications, account menu.
- Shared page header lives in `apps/web/components/page-frame.tsx:105-139`.
- Shared primitives live in `apps/web/components/forge.tsx`, including segmented tabs at `apps/web/components/forge.tsx:436-494`, responsive management tables at `apps/web/components/forge.tsx:538-549`, and workspace rails at `apps/web/components/forge.tsx:669-720`.
- Public homepage content and product language live in `apps/web/components/public/landing-page.tsx:8-82` and render through `argos-3d-page` at `apps/web/components/public/landing-page.tsx:84-99`.

Legacy visual systems still present:

- Auth blue/cyan tokens in `apps/web/app/globals.css:786-824`.
- Legacy public/landing CSS in `apps/web/app/globals.css:885-912`.
- `LegacyAuthShell` blue command-platform surface in `apps/web/components/legacy-shell.tsx:222-275`.
- `AuthShell` logistics-themed split screen in `apps/web/components/legacy-shell.tsx:9-120`.

## Route And Page Inventory

Public and auth routes:

| Route | Main file | UX status |
| --- | --- | --- |
| `/` | `apps/web/app/page.tsx`, `apps/web/components/public/landing-page.tsx` | Current 3D public homepage, strongest source of public product copy. Needs live visual check for motion/3D framing. |
| `/login` | `apps/web/app/login/page.tsx`, `apps/web/components/auth/login-form.tsx`, `apps/web/components/legacy-shell.tsx` | Still legacy blue/cyan auth shell and logistics copy. |
| `/onboarding` | `apps/web/app/onboarding/page.tsx`, `apps/web/components/onboarding-panel.tsx` | Functional create/join/invite flow, but legacy styling. |
| `/invite/[token]` | `apps/web/app/invite/[token]/page.tsx`, `apps/web/components/legacy-shell.tsx` | Functional invite states, legacy shell. |
| `/auth/error` | `apps/web/app/auth/error/page.tsx` | Standalone slate error page, not Forge/auth shell. |
| `/privacy-policy` | `apps/web/app/privacy-policy/page.tsx`, `apps/web/components/public/legal-page.tsx` | Legal content uses old dark/blue card style. |
| `/security-policy` | `apps/web/app/security-policy/page.tsx`, `apps/web/components/public/legal-page.tsx` | Same legal shell drift. |
| `/terms-of-service` | `apps/web/app/terms-of-service/page.tsx`, `apps/web/components/public/legal-page.tsx` | Same legal shell drift. |

Authenticated routes:

| Route | Main file | UX status |
| --- | --- | --- |
| `/dashboard` | `apps/web/app/(authenticated)/dashboard/page.tsx` | Data-rich, but bypasses `PageFrame`, hard desktop padding, and at least one min-width table. Needs mobile visual verification. |
| `/calls` | `apps/web/app/(authenticated)/calls/page.tsx`, `calls-filters.tsx` | One of the better Forge implementations. Has responsive cards and clear filters. |
| `/calls/[id]` | `apps/web/app/(authenticated)/calls/[id]/page.tsx`, `call-detail-panel.tsx` | Strong review bench concept, but media preview, header metadata, and generated-roleplay modal need polish. |
| `/upload` | `apps/web/app/(authenticated)/upload/page.tsx`, `upload-call-panel.tsx` | Clear upload states; dropzone needs keyboard accessibility. |
| `/highlights` | `apps/web/app/(authenticated)/highlights/page.tsx` | Forge-aligned, but scan found a pure-black style and needs visual check. |
| `/training` | `apps/web/app/(authenticated)/training/page.tsx`, `training-panel.tsx`, `components/training/*` | Rich workflow; manager surfaces have focus/style debt and tablet density risks. |
| `/roleplay` | `apps/web/app/(authenticated)/roleplay/page.tsx`, `roleplay-panel.tsx` | Functionally ambitious, but dense two-rail simulation layout and mobile/history table risks. |
| `/team` | `apps/web/app/(authenticated)/team/page.tsx`, `team/team-views.tsx` | Stronger responsive roster with mobile cards. Uses one-off panel classes instead of Forge primitives. |
| `/team/[repId]` | `apps/web/app/(authenticated)/team/[repId]/page.tsx`, `team/team-views.tsx` | Good rep profile structure, needs live visual check. |
| `/leaderboard` | `apps/web/app/(authenticated)/leaderboard/page.tsx` | Source inspected through route inventory; needs authenticated visual verification. |
| `/notifications` | `apps/web/app/(authenticated)/notifications/page.tsx`, `notifications-panel.tsx` | Source inspected; needs authenticated visual verification. |
| `/settings` | `apps/web/app/(authenticated)/settings/page.tsx`, `settings/layout.tsx` | Clear settings hub, but global nav plus local rail can become heavy on tablet. |
| `/settings/people` | `settings/people-panel.tsx` | Uses Forge management patterns. |
| `/settings/teams` | `settings/teams-panel.tsx` | Uses Forge management patterns. |
| `/settings/permissions` | `settings/permissions-panel.tsx` | Uses Forge management patterns. |
| `/settings/compliance` | `settings/compliance-panel.tsx` | Source inspected; needs authenticated visual verification. |
| `/settings/integrations` | `settings/integrations-panel.tsx` | Clear cards, but disconnect failure is silent. |
| `/settings/rubric` | `settings/rubrics-panel.tsx` | Powerful but very dense; needs simplification and a11y pass. |

## Top 10 UX/UI Issues Ranked By User Impact

1. **Pre-auth experience still feels like a different product.** `/login`, `/onboarding`, `/invite/[token]`, `/auth/error`, and legal pages use older blue/slate shells, while the homepage and authenticated app use warm Forge. Evidence: `AuthShell` hardcodes blue/cyan and says "global logistics operations" at `legacy-shell.tsx:61-65`; auth footer links are `href="#"` at `legacy-shell.tsx:90-112`; login uses `#74b1ff` and `#000000` at `login-form.tsx:168-201`.

2. **Dashboard does not share the page contract used elsewhere.** `/dashboard` starts with raw padding and role-specific sections instead of `PageFrame` or the newer Forge header pattern (`dashboard/page.tsx:66-84`). The Rep Skill Matrix is a min-width desktop table (`dashboard/page.tsx:355-359`), unlike Calls and Team which have mobile card fallbacks.

3. **Roleplay is likely too dense on mobile and tablet.** The simulation uses two bookend rails (`roleplay-panel.tsx:477-535` and `roleplay-panel.tsx:695-788`), a fixed `h-[480px]` transcript (`roleplay-panel.tsx:593-597`), a static-looking "Text" mode label beside the Voice button (`roleplay-panel.tsx:561-574`), and a full table for history with no mobile fallback (`roleplay-panel.tsx:790-830`).

4. **Call detail promises media controls that are not real enough.** The review bench media panel shows a play button and fixed one-third progress bar (`call-detail-panel.tsx:433-447`) even when it only says "Transcript linked" or "No media linked." Users may assume audio/video playback exists.

5. **Generate Roleplay modal needs accessibility and interaction hardening.** It is a custom fixed overlay without `role="dialog"`, `aria-modal`, focus trap, escape handling, or an aria label on the close icon (`call-detail-panel.tsx:756-835`).

6. **Upload state design is strong, but the main dropzone is not keyboard-accessible.** The drag/click upload target is a clickable `<div>` with a hidden file input (`upload-call-panel.tsx:144-178`). It needs a real button/label pattern, `tabIndex`, and Enter/Space behavior.

7. **Rubric builder is powerful but over-compressed.** `/settings/rubric` combines source/import/version history, category editing, readiness, validation, and publish controls across rails and dense category rows (`rubrics-panel.tsx:460-562`, `rubrics-panel.tsx:596-685`, `rubrics-panel.tsx:905-1036`). `Remove` sits inside a `<summary>` row (`rubrics-panel.tsx:661-684`), which is risky for keyboard and accidental disclosure toggles.

8. **Important failure states are missing or too quiet.** Zoom disconnect only updates UI on `response.ok` and otherwise silently ends mutation (`integrations-panel.tsx:63-75`). That leaves a user with no explanation if the integration action fails.

9. **Navigation/menu controls need a keyboard pass.** The account menu uses `aria-hidden` and pointer gating, but no menu role, roving/focus behavior, Escape handling, or focus return (`app-shell.tsx:304-357`). The mobile nav open button uses the `filter_list` icon for navigation (`app-shell.tsx:251-260`), which is visually ambiguous.

10. **Design-system adoption is incomplete.** The codebase still carries multiple styling systems: Forge tokens (`globals.css:3-42`), auth blue tokens (`globals.css:786-824`), legacy landing tokens (`globals.css:885-912`), one-off shell panel classes in Team (`team-views.tsx:22-27`), and pure-black flags from the deterministic scan in Highlights/AppShell/Training.

## Findings Table

| Severity | Page/flow | Evidence | User impact | Recommended fix | Verification needed |
| --- | --- | --- | --- | --- | --- |
| High | `/login` | `legacy-shell.tsx:61-65` references "global logistics operations"; `login-form.tsx:190-201` uses blue gradient. | First impression conflicts with sales coaching product and homepage. | Rebuild login inside a Forge-auth shell using homepage copy, real legal links, and Forge tokens. | Desktop/mobile visual check unauthenticated. |
| High | `/onboarding`, `/invite/[token]` | `LegacyAuthShell` in `legacy-shell.tsx:222-275`; onboarding cards in `onboarding-panel.tsx:70-106`. | New org/join flow feels older than the authenticated app users enter next. | Move create/join/invite steps to Forge panels and reuse auth shell. | Verify create, join, invite, invalid invite, accepted invite states. |
| High | `/dashboard` | Raw layout at `dashboard/page.tsx:66-84`; min-width table at `dashboard/page.tsx:355-359`. | Most users start here, but hierarchy and responsive behavior are less consistent than Calls/Team. | Wrap dashboard in `PageFrame`, add role-specific header tools, convert skill matrix to Forge mobile cards. | Authenticated desktop/tablet/mobile screenshots. |
| High | `/roleplay` | Two-rail layout at `roleplay-panel.tsx:477-535` and `695-788`; fixed transcript at `593-597`; history table at `790-830`. | Reps may struggle to start, respond, score, and review history on small screens. | Collapse secondary rail behind tabs/drawer on mobile, make transcript height responsive, add mobile history cards. | Authenticated mobile/tablet roleplay session check. |
| High | `/calls/[id]` | Media preview/play/progress at `call-detail-panel.tsx:433-447`. | Users may expect playback where only transcript metadata exists. | Show a true media state: playable recording, transcript-only state, processing state, or unavailable state. | Check complete, processing, failed, transcript-only calls. |
| High | `/calls/[id]` Generate Roleplay | Modal overlay at `call-detail-panel.tsx:756-835` lacks dialog semantics/focus handling. | Keyboard/screen-reader users can get trapped or lose context. | Use a shared modal primitive with `role=dialog`, `aria-modal`, labelled heading, focus trap, Escape close. | Keyboard-only and screen reader smoke test. |
| Medium | `/upload` | Clickable dropzone `<div>` at `upload-call-panel.tsx:144-178`; status panels at `227-255`. | Upload feedback is good, but keyboard users may not be able to select a file. | Convert dropzone to `<label>`/button pattern with keyboard activation and visible focus. | Keyboard upload path. |
| Medium | `/settings/rubric` | Dense source/edit/readiness rails at `rubrics-panel.tsx:460-562`, `596-745`, `905-1036`. | Admins can complete tasks, but the path to "publish safely" is mentally expensive. | Split into clearer steps: source, edit, validate, publish; keep readiness sticky but reduce duplicate controls. | Authenticated admin visual check with long rubric data. |
| Medium | `/settings/integrations` | `handleDisconnect` has no visible error branch at `integrations-panel.tsx:63-75`. | Failed disconnects look like nothing happened. | Add error state and retry copy beside disconnect controls. | Simulate non-OK API response. |
| Medium | Shell account menu | `app-shell.tsx:304-357`. | Keyboard users get less predictable menu behavior. | Add menu semantics, Escape close, focus return, and keyboard navigation. | Keyboard-only navigation through topbar. |
| Medium | Public legal pages | `legal-page.tsx:17-78` uses old dark/blue card style. | Legal pages feel detached from the current homepage and auth experience. | Restyle legal shell with current homepage/Forge tokens and real footer rhythm. | Desktop/mobile unauthenticated check. |
| Medium | Calls filters | `calls-filters.tsx:189-229` has two clear-filter actions. | Minor clutter and duplicated affordance. | Keep one clear action, or make chip-level clear behavior explicit. | Calls list desktop/mobile check. |
| Low | Team pages | One-off panel classes at `team-views.tsx:22-27`; mobile cards at `team-views.tsx:133-140`. | Team is visually good, but primitives drift from shared Forge implementation. | Gradually move panels to Forge primitives or formalize those classes as shared variants. | Visual regression check on roster/profile. |
| Low | Reduced motion | Forge reduced motion only covers nav/buttons/surfaces/skeleton at `globals.css:773-783`; homepage motion handled separately at `landing-motion-controller.tsx:25-28`. | Some animated panels outside these selectors may still move. | Audit all `animate-*`, transitions, 3D scene, and pulse indicators under reduced motion. | Browser check with reduced motion enabled. |

## Whole-Product Consistency

The product now has a credible Forge identity: warm black/brown surfaces, gold primary actions, ember/cyan accents, Material Symbols icons, rounded panels, compact eyebrow labels, and dense operational layouts. The strongest examples are `/calls`, `/team`, many settings panels, and upload states.

The inconsistency is concentrated at transition points:

- Public homepage says sales call review, scoring, highlights, training, and roleplay in precise product language (`landing-page.tsx:15-47`).
- Login switches to "global logistics operations" and blue/cyan command-center visuals (`legacy-shell.tsx:61-65`).
- Onboarding and invite keep the older "Revenue Command Platform" shell (`legacy-shell.tsx:233-238`).
- Legal pages use an old blue legal card (`legal-page.tsx:19-58`).
- Authenticated app mostly uses Forge, but `/dashboard` bypasses `PageFrame`, while `/calls`, `/upload`, `/team`, and settings are closer to the shared contract.

Recommendation: treat Forge as the product system. Do not make feature pages into marketing pages. Make pre-auth routes, dashboard, roleplay, and call detail feel operational like Calls/Team/Settings.

## Information Architecture

The authenticated nav grouping is mostly clear:

- Review: Dashboard, Calls, Highlights
- Coach: Training, Roleplay
- People: Team, Leaderboard
- System: Notifications, Settings

This maps well to user intent and is encoded in `app-shell.tsx:200-229`. The topbar area labels are also helpful (`app-shell.tsx:419-430`).

IA risks:

- "Share Insight" on `/calls/[id]` links to `/highlights` (`calls/[id]/page.tsx:75-81`), but the label sounds like a share action rather than navigation to the highlights library.
- `/settings/rubric` mixes admin source selection, import preview, validation, editing, readiness, server draft, and publishing on one surface. The steps exist, but the screen still reads as an expert tool.
- `/dashboard` has role-specific content but no shared header or page-frame explanation, so a new user may not know whether to upload a call, inspect a rep, or configure setup next.

## Workflow Usability

Sign in/onboarding:

- Google and email sign-in are available, but copy and links need cleanup. `Security Protocol` and `Terms of Access` links are placeholders (`login-form.tsx:211-218`).
- Create/join/invite states exist and are practical (`onboarding-panel.tsx:70-310`), but they look visually separate from the app.

Creating or joining an org:

- The flow is clear enough at source level: choose create/join, enter org name/slug, invite team.
- Needs Forge migration and stronger disabled/error states around slug conflicts and invite failures.

Uploading calls:

- This is one of the best flows. It has choose/context/upload steps, ready state, upload progress, analysis state, upload failed state, file limits, and "Upload and analyze" action (`upload-call-panel.tsx:120-272`).
- Main gap: keyboard-accessible file selection.

Reviewing/filtering calls:

- `/calls` is clear and intentionally operational: count chip, active filter chip, upload action, filters, responsive table/cards (`calls/page.tsx:50-140`).
- Minor clutter: two clear-filter controls in active state (`calls-filters.tsx:189-229`).

Call detail:

- Good review bench pattern and score/workbench structure.
- Needs honest media state and accessible modal handling.

Training:

- Rich manager and learner tooling exists. Manager modal itself has better accessibility than the call-detail modal in prior inspection.
- Inline manager forms still use many one-off inputs with `outline-none` and weak focus (`training-panel.tsx:752-845`, `903-918`).

Roleplay:

- The flow is understandable in source: choose persona, start simulation, voice/text response, score, history.
- It is visually and spatially heavy. Voice/Text affordance should be clarified; send icon needs accessible label; history needs mobile fallback.

Team/admin:

- Team roster and rep profile are among the better operational pages, with mobile cards and clear row affordances (`team-views.tsx:114-140`).
- Settings local rail is useful but creates a second navigation rail next to the global nav on desktop/tablet (`settings/layout.tsx:20-33`).

Integrations/settings:

- Zoom/GHL settings are understandable; missing disconnect error state is the main issue.
- Rubric management needs progressive disclosure, not more controls.

## Visual Hierarchy And Layout

Strong hierarchy:

- `/calls` uses a concise header, action, filters, and responsive ledger.
- `/team` gives overview stats before the roster and uses clear mobile cards.
- `/upload` uses explicit step panels and status panels.

Weak hierarchy:

- `/dashboard` starts with raw role views and hard `px-12`, which makes it feel less like the rest of the app (`dashboard/page.tsx:66-84`).
- `/roleplay` puts two rails, transcript, controls, scorecard, pro tip, and history on one page. The fixed transcript height and rail density are the main problems.
- `/settings/rubric` exposes too many admin concepts at once.
- `/calls/[id]` header chips include internal `#{id}` and viewer/role (`calls/[id]/page.tsx:60-70`), which should be lower-priority metadata.

Over-carded/nested-card risks:

- Legacy auth and onboarding use large rounded cards inside framed shells (`legacy-shell.tsx:228-255`).
- Rubric builder uses rails plus nested rows plus readiness cards, which is functional but visually heavy.
- Roleplay scorecard rail includes multiple nested panels and a "Pro Tip" card with blue styling (`roleplay-panel.tsx:777-785`).

## State Design

Good state design:

- Upload: disabled/ready/uploading/analyzing/error states are explicit (`upload-call-panel.tsx:227-255`).
- Calls: empty list has a Forge empty state; mobile cards exist.
- Rubrics: validation issues/import warnings/server draft readiness are present (`rubrics-panel.tsx:934-985`).

Needs state work:

- Call media: no true playable/unavailable/processing state separation.
- Integrations: disconnect failure has no user-visible state.
- Roleplay: voice errors are shown, but status and errors need clearer severity and recovery actions (`roleplay-panel.tsx:652-659`).
- Auth links: placeholder legal links create dead-end states.

## UX Copy

Preserve current homepage product language. It is specific and aligned to the real app: calls, transcript, speaker labels, scorecard, highlights, training, roleplay, rubrics, integrations.

Copy to fix:

- `/login`: "global logistics operations" is wrong for this product (`legacy-shell.tsx:64-65`).
- `/login`: "Security Protocol" and "Terms of Access" are not the actual legal page names and link to `#` (`login-form.tsx:211-218`).
- `/calls/[id]`: "Share Insight" should describe the actual action, likely "View highlights" or "Open highlights" if it only navigates (`calls/[id]/page.tsx:79-80`).
- `/roleplay`: static "Text" beside a Voice button reads like a segmented mode control but does nothing (`roleplay-panel.tsx:561-574`).
- `/settings/integrations`: "Are you sure?" is too terse for disconnecting a production integration (`integrations-panel.tsx:120-145`).

## Responsive And Mobile Risks

Needs live visual verification at desktop, tablet, and mobile widths:

- `/dashboard`: `px-12` outer layout and `min-w-[760px]` matrix table (`dashboard/page.tsx:66-84`, `355-359`).
- `/roleplay`: two rails, fixed 480px transcript, history table without mobile cards (`roleplay-panel.tsx:477-597`, `790-830`).
- `/settings/rubric`: two rails plus dense category rows and readiness controls (`rubrics-panel.tsx:460-562`, `596-745`, `905-1036`).
- `/settings`: global app rail plus settings local rail (`settings/layout.tsx:20-33`).
- `/calls/[id]`: media preview and workbench should be checked with long call topics and long AI-generated scenario summaries.

Responsive positives:

- `/calls` uses `ForgeManagementTable` plus mobile cards (`calls/page.tsx:89-140`, `forge.tsx:538-549`).
- `/team` has explicit mobile roster cards (`team-views.tsx:133-140`).
- Upload actions wrap well with `flex-col` to `sm:flex-row` (`upload-call-panel.tsx:257-272`).

## Accessibility Risks

Keyboard/navigation:

- Upload dropzone is a clickable non-semantic `div` (`upload-call-panel.tsx:144-178`).
- Account menu needs menu semantics and Escape/focus handling (`app-shell.tsx:304-357`).
- Generated Roleplay modal needs dialog semantics and focus trap (`call-detail-panel.tsx:756-835`).
- Roleplay send icon button has no accessible label (`roleplay-panel.tsx:672-679`).
- Roleplay history table rows use `onClick` on `<tr>` without a keyboard equivalent (`roleplay-panel.tsx:816-820`).

Focus states:

- Training manager inline inputs and selects often use `outline-none` without a visible replacement (`training-panel.tsx:752-845`, `903-918`).
- Rubric builder inputs also use `outline-none` repeatedly (`rubrics-panel.tsx:630-743`).

Color/contrast/motion:

- Deterministic scan found pure-black/white flags in Highlights, AppShell overlay, and Training files.
- Reduced motion covers some Forge selectors and skeleton sheen (`globals.css:773-783`), and homepage reveal motion checks `prefers-reduced-motion` (`landing-motion-controller.tsx:25-28`), but this needs a full audit across all `animate-*`, pulse indicators, scene motion, and transitions.

## Unfinished Or Half-Polished UI

- Login and auth shell are visually unfinished relative to the current homepage and app.
- Legal footer links in auth are placeholders.
- Call detail media preview looks like a player but is not connected to real playback state.
- Generate Roleplay modal is functionally useful but lacks production modal behavior.
- Roleplay "Text" mode affordance is misleading.
- Roleplay "Pro Tip" styling uses blue accents outside Forge (`roleplay-panel.tsx:777-785`).
- Dashboard has useful data but feels like an older layout layer.
- Rubric builder is a complete tool, but not yet a calm admin workflow.
- Integrations disconnect has no visible error branch.

## Frontend Implementation Risks Affecting UX

- Multiple visual systems remain active in `globals.css`: Forge, auth blue, legacy variables, and landing-specific CSS.
- Team pages have good custom layouts but define their own panel classes instead of reusing `ForgeSurface` variants (`team-views.tsx:22-27`).
- Dashboard uses local `SurfacePanel`/`EmptyState` patterns rather than shared `PageFrame`/Forge management helpers.
- Roleplay mixes data loading, realtime/voice controls, transcript rendering, layout, and scoring UI in one large component. This increases risk when tuning responsive behavior.
- Rubrics panel similarly combines import, edit, validation, preview, publish, and rail controls in one large component.
- Focus and modal behavior should have reusable tests. Existing focused tests passed, but they are not covering all keyboard/modal state risks.

## Quick Wins Under 1 Hour

1. Change `/login` footer links from `#` to `/privacy-policy`, `/terms-of-service`, and `/security-policy`.
2. Replace "global logistics operations" in `AuthShell` with sales-coaching/call-review language from the homepage.
3. Rename "Share Insight" on `/calls/[id]` to the actual navigation intent.
4. Add `aria-label` to call-detail play button, modal close button, roleplay send button, and any icon-only action missing labels.
5. Add visible error state to Zoom disconnect failure.
6. Remove the duplicate "Clear filters" text button or make clear behavior chip-specific.
7. Replace the roleplay "Text" static label with a real disabled/active segmented control or plain explanatory label.
8. Add visible focus utilities to training and rubric inputs currently using `outline-none`.
9. Replace the blue roleplay "Pro Tip" accent with Forge gold/ember/cyan tokens.
10. Add a mobile card fallback for roleplay Recent History.

## Larger Redesign Projects

1. **Pre-auth Forge migration:** rebuild login, onboarding, invite, auth error, and legal pages as one Forge-compatible pre-auth system tied to homepage copy.
2. **Dashboard page contract:** bring dashboard into `PageFrame`, define role-specific primary actions, and convert desktop-only matrix areas to responsive cards.
3. **Roleplay simulation workspace:** simplify mobile/tablet layout, make transcript/input/score states primary, and move secondary rails into collapsible panels or tabs.
4. **Call detail review bench polish:** replace fake media player with real media/transcript states, improve generated-roleplay modal, and demote internal metadata.
5. **Rubric admin workflow:** turn the current dense builder into a clearer stepper with source, edit, validate, publish, and history separated by task intent.
6. **Shared accessibility primitives:** modal, menu, dropzone, table-row link/card pattern, focus-ring utility, and reduced-motion coverage.

## Suggested Order Of Fixes For The Next 1-2 Weeks

Week 1:

1. Fix the high-trust entry issues: login copy/legal links, auth shell product language, auth error styling.
2. Patch clear accessibility issues: upload dropzone semantics, generated-roleplay modal semantics, icon button labels, account menu Escape/focus return.
3. Add missing integration disconnect error feedback.
4. Rename misleading call-detail and roleplay labels.
5. Capture authenticated screenshots for `/dashboard`, `/calls`, `/calls/[id]`, `/upload`, `/training`, `/roleplay`, `/team`, `/settings`, `/settings/rubric`.

Week 2:

1. Rework dashboard into shared PageFrame/Forge patterns and add mobile cards for the matrix.
2. Simplify roleplay responsive layout and history.
3. Start pre-auth Forge migration for onboarding/invite/legal.
4. Plan rubric builder step split and test coverage.
5. Add keyboard and responsive tests for dropzone, modal, account menu, roleplay history, and dashboard matrix.

## Screenshots Taken Or Routes Inspected

Screenshots:

- None captured this run.

Why:

- `npm run dev -w @argos-v2/web -- --hostname 127.0.0.1 --port 3129` started Next successfully and showed `Ready`.
- `lsof` showed Node listening on `127.0.0.1:3129`.
- `curl` and Node `fetch` could not connect back to the local port from the sandbox.
- `nc -vz 127.0.0.1 3129` returned `Operation not permitted`.
- The local Playwright wrapper attempted to fetch `@playwright/cli` and failed with `ENOTFOUND registry.npmjs.org`.
- Browser-use tools were not exposed through tool discovery in this session.

Routes/source inspected:

- Public/auth: `/`, `/login`, `/onboarding`, `/invite/[token]`, `/auth/error`, `/privacy-policy`, `/security-policy`, `/terms-of-service`.
- Authenticated/source only: `/dashboard`, `/calls`, `/calls/[id]`, `/upload`, `/highlights`, `/training`, `/roleplay`, `/team`, `/team/[repId]`, `/leaderboard`, `/notifications`, `/settings`, `/settings/people`, `/settings/teams`, `/settings/permissions`, `/settings/compliance`, `/settings/integrations`, `/settings/rubric`.
- Major UI components: `app-shell.tsx`, `page-frame.tsx`, `forge.tsx`, `landing-page.tsx`, `legacy-shell.tsx`, `login-form.tsx`, `onboarding-panel.tsx`, `upload-call-panel.tsx`, `call-detail-panel.tsx`, `roleplay-panel.tsx`, `training-panel.tsx`, `components/training/*`, `team-views.tsx`, `settings/*`.

## Commands Run And Results

| Command | Result |
| --- | --- |
| `git branch --show-current` | `main` |
| `git rev-parse HEAD` | `a925786efeaaf7012ad8d16bd825f067f3569e5f` |
| `git status --short` | Pre-existing untracked docs paths listed above. |
| `git worktree list` | Target repo on `main`; automation worktree detached at same HEAD. |
| `node /Users/thevibecodebro/.codex/skills/impeccable/scripts/load-context.mjs` | No root `PRODUCT.md` or `DESIGN.md`; source of truth had to come from current code. |
| `find apps/web/app -maxdepth 4 -type f \\( -name 'page.tsx' -o -name 'layout.tsx' \\) | sort` | Produced the route inventory used above. |
| `find apps/web/components -maxdepth 3 -type f | sort` | Produced major component inventory. |
| `npx impeccable --json --fast apps/web/app apps/web/components` | Found 7 pure-black/white style flags in Highlights, AppShell overlay, and Training files. |
| `npm run dev -w @argos-v2/web -- --hostname 127.0.0.1 --port 3129` | Next dev server reported ready, but sandbox browser/curl connection was blocked. |
| `curl -I http://127.0.0.1:3129/` and `/login` | Failed to connect from sandbox. |
| `nc -vz 127.0.0.1 3129` | `Operation not permitted`. |
| Playwright wrapper `open/list` | Failed because npm could not reach `registry.npmjs.org/@playwright%2fcli`. |
| `npm run test -w @argos-v2/web -- --run ...` | 11 test files passed, 66 tests passed. |

Focused tests passed:

- `lib/authenticated-forge-token-coverage.test.ts`
- `lib/app-shell.test.ts`
- `lib/calls-filters-forge.test.tsx`
- `lib/upload-call-panel.test.tsx`
- `lib/roleplay-panel.test.ts`
- `lib/settings-nav.test.tsx`
- `lib/people-panel.test.tsx`
- `lib/teams-panel.test.tsx`
- `lib/rubrics-panel.test.tsx`
- `lib/training-panel.test.tsx`
- `lib/primary-route-hero-removal.test.ts`

## Things Not Checked And Why

- Live screenshots of authenticated pages: blocked by local browser/tooling access and auth.
- Actual logged-in flows for org creation, invite acceptance, upload submission, call processing, generated roleplay, voice roleplay, and rubric publish: source inspected only; these need seeded data and an authenticated browser.
- Browser-level color contrast measurements: source-level color review only.
- Keyboard-only pass in a real browser: source-level risks identified, but no live focus traversal.
- Reduced-motion behavior in the 3D homepage scene and app pages: source inspected, no browser verification.
- Tablet-specific double-rail behavior for Settings, Roleplay, and Rubrics: needs real screenshots at tablet widths.

