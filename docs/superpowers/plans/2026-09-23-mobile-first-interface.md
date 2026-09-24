# Mobile-first interface implementation plan

**Goal:** Bring the lesson and primary actions into the first phone viewport while simplifying shared authenticated chrome across viewport sizes.
**Architecture:** Preserve PRODUCT.md and DESIGN.md, tenant tokens, permissions, routes, and progress handlers. Adapt existing components; no backend changes.
**Tech stack:** Next.js, React, Tailwind, Vitest.

- [x] Make the learner module list a native disclosure below desktop width and an always-visible desktop column. Keep all titles readable and selected state explicit.
- [x] Flatten the lesson stage, remove repeated descriptions and decorative labels, retain quiz/progress behavior and expose accessible keyboard tabs.
- [x] Simplify shared operational headers; enlarge mobile navigation targets and preserve bottom safe-area clearance. Keep tenant branding.
- [x] Align loading presentation and test disclosure, lesson/quiz semantics, existing manager/learner behavior, and shared shell contracts.
- [x] Run focused tests, web typecheck/build, Impeccable detector, and one batched mobile/tablet/desktop preview inspection. Fix findings together and confirm once.

Preview uses synthetic modules through real components; it must not write tenant data or ship a preview route.

## Verification

- 1,246 tests across 196 web test files passed, including disclosure focus restoration and keyboard tab selection.
- Web typecheck passed; production build passed with local placeholder public Supabase configuration (no production credentials or tenant writes).
- In-app browser inspected synthetic content using the real shell and training components at 320, 390, 768, 1024, and 1440 CSS pixels. No horizontal overflow; module selection and keyboard tab switching verified. Physical-device Safari/Android and authenticated production flows were not tested.
- Impeccable detector returned no findings. Independent review's focus and viewport safe-area findings were resolved.
- Temporary preview route removed. Changes remain local in the task worktree; no deployment performed.

## Broader responsive pass

User expanded the work to desktop and the broader mobile experience. The implementation now also covers:

- Permission-filtered mobile workspace navigation, including pages outside the five bottom destinations; mobile organization switching with instance-safe IDs.
- Collapsible secondary navigation for settings and similar workspaces, with current-section labels and focus restoration.
- Native modal isolation, scroll locking, nested-dialog handling, and command-shortcut coordination; shared focus, reduced-motion, touch-target, and selected-link contrast improvements.
- Mobile evidence rows for highlights, leaderboard, and roleplay history; desktop tables retained. Supporting summaries become disclosures below 1536px so the main list has room.
- Call detail transcript/coaching shortcuts and simplified headers.
- Roleplay scenario disclosure during a live session and reduced empty transcript height on phones.
- Upload file selection first, with optional context and technical video handling behind a disclosure; queue/status logic preserved.

### Browser evidence

Real components with synthetic, non-production content were checked in the Codex in-app browser. Training, calls, roleplay, upload, highlights, leaderboard, history, and settings-navigation previews fit within page widths of 320, 768, and 1024 CSS pixels. A history table grid minimum-width defect found at tablet/laptop widths was fixed and rechecked. Screenshots at 390x844 and 1440x900 confirm mobile and desktop layouts. Modal scroll lock, focus restoration, and Cmd+K isolation were checked. The platform organization picker width correction was code-reviewed; its authenticated switching flow was not exercised.

Static route previews used server-rendered mocked records; call filters were stubbed and the settings form was illustrative. Live component interactions were checked for the shared menu, training, and secondary rail. These previews do not establish production integration or physical-device Safari/Android behavior. Dashboard, team, notifications, and other settings forms benefit from shared shell/control fixes but did not receive individual authenticated end-to-end audits in this pass.

Evidence files: `/Users/thevibecodebro/.codex/visualizations/argos-ui-preview/desktop-training.png`, `desktop-highlights.png`, `mobile-roleplay.png`, `mobile-upload.png`, and `mobile-history.png`.

Design checks were informed by W3C reflow guidance (https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and target-size guidance (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). The interface uses 44px mobile targets as a design choice; this is not a claim of full WCAG conformance.

Temporary preview files and server removed after capture. All changes remain in the isolated local task worktree; no production deployment or tenant mutation.

Final broad-pass verification: all 1,252 web tests across 197 files passed; standalone web typecheck and production build passed. Build used placeholder public Supabase configuration. `git diff --check` passed. Independent review findings about command search and mobile organization switching were resolved before final verification.

## Copy reduction follow-up

Removed repeated introductory descriptions from dashboard, calls, highlights, leaderboard, team, notifications, roleplay, and roleplay history. Removed the second Highlights introduction and duplicate item count; the retained count now handles singular items. Removed the roleplay scorecard's repeated score label, generic description, and static tip unrelated to the selected scenario. Replaced verbose pending-score guidance with a short state and an explicit next action. Kept data, contextual feedback, form constraints, error recovery, and ranking explanations. Remaining terminology recommendation: consistently use Recordings and Roleplay in navigation and interface copy; no broad terminology rename performed.

Copy-pass verification: web typecheck passed; all 1,252 web tests passed with four workers. Default-concurrency runs hit unrelated backend-test timeouts; reducing concurrency resolved them. Copy assertions were updated for removed introductions and renamed scorecard states. `git diff --check` passed. Changes remain local and undeployed.

## Approved terminology follow-up

Standardized the recording-library page, loading heading, return/open links, upload completion link, dashboard category, and public product preview to Recordings. Standardized practice status, start action, empty state, and public preview to Roleplay. Preserved Calls where it measures sales-call volume, and preserved technical route/data identifiers. Updated affected copy assertions and preview alt text.
