# Stitch Page Compliance Audit - 2026-05-04

Source of truth: `.stitch/DESIGN.md`

Stitch project: `7663541137437451553`

Scope: every authenticated menu page plus the main drill-down and settings detail pages.

## Summary

The app is not fully matching the Stitch direction yet. The navigation cleanup and new route shells are moving in the right direction, but many pages still mount older dense components inside the new `OperationalWorkspace` wrapper. That is why the experience still feels convoluted: the top-level chrome is simple, but the body often still behaves like the old forge UI.

The highest-priority mismatches are:

1. `/dashboard`
2. `/training`
3. `/roleplay`
4. `/settings/rubric`
5. `/settings/permissions`
6. `/settings/teams`
7. `/team` and `/team/[repId]`

The pages closest to the Stitch target are:

1. `/highlights`
2. `/leaderboard`
3. `/calls`
4. `/upload`

## Classification Key

- `Matches Stitch`: the page mostly follows the approved pattern and only needs light polish.
- `Partially Matches`: the shell or main idea is right, but the body still has complexity that should be reduced.
- `Does Not Match`: the page still violates the "one page, one primary job" rule or mounts old complex layouts inside the new shell.

## Page Audit

| Route | Classification | Main finding | Split worth considering? |
| --- | --- | --- | --- |
| `/dashboard` | Does Not Match | New toolbar/metric strip exists, but the body repeats metric cards and stacks role-specific analytics widgets. | Yes |
| `/calls` | Partially Matches | Dense table plus preview drawer is correct; filter and saved-view chrome can still be lighter. | No |
| `/calls/[id]` | Partially Matches | Review bench direction is correct, but detail panel still has many nested tab sections and the route adds a second summary drawer. | Not yet |
| `/upload` | Partially Matches | Focused upload route is close; lifecycle messaging is duplicated between route metric strip and inner panel. | No |
| `/highlights` | Matches Stitch | Table plus evidence drawer matches the target. | No |
| `/training` | Does Not Match | One page carries learner training, team progress, module library, and builder controls. | Yes |
| `/roleplay` | Does Not Match | Practice, scenario rail, score rail, and history are all visible in one complex client surface. | Yes |
| `/team` | Partially Matches | Table plus selected-rep drawer is right, but old segment cards and too many columns remain. | No |
| `/team/[repId]` | Partially Matches | Shell is right; inner profile still splits focus across multiple equal-weight card grids. | Not yet |
| `/leaderboard` | Matches Stitch | Ranked table plus preview drawer is aligned. | No |
| `/notifications` | Partially Matches | Account inbox belongs under account, but the full route still feels heavier than a secondary inbox. | No |
| `/settings` | Partially Matches | Internal settings map is right; inline account panel adds a second page job. | No |
| `/settings/people` | Partially Matches | Intended people-table job is right, but the page nests a second `ForgeWorkspaceLayout` and invite rail inside Settings. | Not if simplified |
| `/settings/teams` | Does Not Match | Settings shell wraps another rail layout with create/select/team membership surfaces. | Maybe |
| `/settings/permissions` | Does Not Match | Multiple permission jobs are stacked: team context, presets, counts, preset assignment, primary manager assignment. | Yes |
| `/settings/integrations` | Partially Matches | Provider cards are understandable, but a compact provider status table would match Stitch better. | No |
| `/settings/rubric` | Does Not Match | Active overview and full rubric builder are mixed in one default settings page. | Yes |
| `/settings/compliance` | Partially Matches | The job is clear, but it still uses older `ForgeSurface` panels instead of the Settings detail table/status pattern. | No |

## Detailed Findings

### `/dashboard` - Does Not Match

Evidence:

- The route has the new operational shell and metric strip at `apps/web/app/(authenticated)/dashboard/page.tsx:75` and `:94`.
- The body repeats metric cards immediately afterward at `apps/web/app/(authenticated)/dashboard/page.tsx:224` to `:229`.
- Manager/executive views repeat more metric cards and widgets at `apps/web/app/(authenticated)/dashboard/page.tsx:344` to `:360` and `:395` to `:414`.
- Legacy `MetricCard`, `SurfacePanel`, and `ForgeWidget` helpers still define the body at `apps/web/app/(authenticated)/dashboard/page.tsx:753` and `:772`.

Why it feels convoluted:

The page tries to be a rep dashboard, manager dashboard, executive dashboard, setup health monitor, training summary, call volume dashboard, leaderboard, and badge surface at the same time. This breaks the Stitch rule: one page, one primary job.

Optimization:

Make `/dashboard` a "Today" page. Keep one metric strip, then show one operational table/list of attention items: new calls, failed analyses, coaching flags, overdue training, setup issues. Put the selected item in the right drawer. Move analytics detail to `/team`, `/leaderboard`, `/training`, and `/calls`.

Split recommendation:

Yes. Do not add new pages for everything, but remove deep analytics from the dashboard default and route users to the existing purpose-built pages.

### `/calls` - Partially Matches

Evidence:

- Correct shell: `OperationalToolbar`, `OperationalMetricStrip`, table, and drawer at `apps/web/app/(authenticated)/calls/page.tsx:62` to `:138`.
- The table shape starts at `apps/web/app/(authenticated)/calls/page.tsx:231`.
- Filters are nested into the toolbar at `apps/web/app/(authenticated)/calls/page.tsx:78` to `:103`.

Why it still feels a little heavy:

Saved views, filters, status, metric strip, table, and drawer all compete in the first viewport. The page is structurally correct, but the toolbar can be quieter.

Optimization:

Keep the table plus drawer. Collapse advanced filters behind a filter button or keep one compact filter row. Let status tabs do less work unless they are truly needed.

Split recommendation:

No. This page is the right shape.

### `/calls/[id]` - Partially Matches

Evidence:

- Route shell follows the Stitch review-bench shape at `apps/web/app/(authenticated)/calls/[id]/page.tsx:53` to `:123`.
- Inner panel has transcript, moments, summary, and notes tabs at `apps/web/components/call-detail-panel.tsx:380` to `:409`.
- Inner transcript and moments sections still contain many nested rows and controls at `apps/web/components/call-detail-panel.tsx:413` to `:594`.

Why it still feels clunky:

The route already has a right drawer, while the inner `CallDetailPanel` also carries its own category, moments, notes, and score context. That creates two layers of summary instead of one clear 65/35 review bench.

Optimization:

Keep the tabbed workbench. Move the strongest selected-call context into one drawer only. Make transcript/moments rows denser and remove repeated explanatory copy.

Split recommendation:

Not yet. Tighten the bench first.

### `/upload` - Partially Matches

Evidence:

- Route uses the Stitch upload shape at `apps/web/app/(authenticated)/upload/page.tsx:13` to `:65`.
- Inner upload panel still has its own three-step row at `apps/web/components/upload-call-panel.tsx:171`.

Why it still feels clunky:

The route metric strip and the upload panel both explain the lifecycle. This makes a simple form feel more ceremonial than it needs to.

Optimization:

Keep one lifecycle indicator total. Prefer the real upload state inside the panel over static route metrics. The right drawer can stay as readiness/status.

Split recommendation:

No.

### `/highlights` - Matches Stitch

Evidence:

- Route uses toolbar, metric strip, evidence table, and drawer at `apps/web/app/(authenticated)/highlights/page.tsx:42` to `:210`.

Why it works:

The page has one job: scan coaching evidence. The table is primary, and the drawer gives selected-row context.

Optimization:

Minor polish only: reduce the explanatory copy in the table header once the dataset is self-explanatory.

Split recommendation:

No.

### `/training` - Does Not Match

Evidence:

- Route tabs expose My training, Team progress, Module library, and Builder at `apps/web/app/(authenticated)/training/page.tsx:69` to `:85`.
- The route mounts a 1,194-line `TrainingPanel` at `apps/web/app/(authenticated)/training/page.tsx:122`.
- Builder forms, AI generation, assignment controls, quiz editing, and module stage all live in the same component around `apps/web/components/training-panel.tsx:776` to `:1111`.

Why it feels convoluted:

The default page is trying to be learner training, manager progress, course builder, AI draft generator, assignment manager, and lesson player. Anchor tabs do not simplify it because all jobs still live on one surface.

Optimization:

Make `/training` learner-first. Show assigned modules and selected module stage. Move manager progress and builder into separate views or routes. Keep one compact drawer for progress/readiness.

Split recommendation:

Yes. Recommended split:

- `/training`: learner assignments and module stage.
- `/training/team`: team progress table.
- `/training/builder`: module library, AI draft, assignment, and editing workflows.

### `/roleplay` - Does Not Match

Evidence:

- Route shell is operational at `apps/web/app/(authenticated)/roleplay/page.tsx:71` to `:130`.
- Inner panel still uses `ForgeWorkspaceLayout` with two bookend rails at `apps/web/components/roleplay-panel.tsx:521`.
- Scenario rail, practice stage, score rail, and history table all live in one component from `apps/web/components/roleplay-panel.tsx:502` to `:965`.

Why it feels convoluted:

The page has four jobs visible: choose scenario, practice, inspect scorecard, review history. The two-rail layout competes with the global app nav and makes the practice surface feel boxed in.

Optimization:

Default to one practice workbench: scenario picker, conversation stage, and score/readiness drawer. Move history into a secondary table view or separate route. Only show the score drawer after a completed session.

Split recommendation:

Yes. Recommended split:

- `/roleplay`: active practice.
- `/roleplay/history` or a true History tab/view: completed sessions and scoring results.

### `/team` - Partially Matches

Evidence:

- Route shell and selected-rep drawer are correct at `apps/web/app/(authenticated)/team/page.tsx:33` to `:104`.
- `TeamRosterView` still includes extra segment cards at `apps/web/components/team/team-views.tsx:183`.
- The roster table includes Role, Focus area, Training status, and Last reviewed columns at `apps/web/components/team/team-views.tsx:111` to `:116`.

Why it still feels convoluted:

The page wants to be a fast coaching roster, but it still carries too many secondary facts and a segment row below the metric strip.

Optimization:

Remove the segment cards. Use a tighter roster table with Rep, Score, Calls, Trend, Status, Action. Move role/training/last-reviewed detail to the drawer or profile page.

Split recommendation:

No. Simplify before adding routes.

### `/team/[repId]` - Partially Matches

Evidence:

- Route shell follows the Stitch rep profile shape at `apps/web/app/(authenticated)/team/[repId]/page.tsx:54` to `:117`.
- Inner profile uses multiple grid sections at `apps/web/components/team/team-views.tsx:285` and `:340`.

Why it still feels convoluted:

The page is close, but focus areas, weekly trend, calls, badges, and summary all appear as similarly weighted surfaces. The user should see a single coaching workbench, not a profile dashboard.

Optimization:

Make the left side a tabbed coaching bench: Focus, Calls, Trend, Badges. Keep the right drawer as the rep summary and next action.

Split recommendation:

Not yet. The drill-down page is appropriate if the body is tightened.

### `/leaderboard` - Matches Stitch

Evidence:

- Route uses metric strip, ranked table, and drawer at `apps/web/app/(authenticated)/leaderboard/page.tsx:34` to `:195`.

Why it works:

The page has one job: compare reps. The table is primary, the drawer supports the selected rank, and the view switcher is compact.

Optimization:

Keep this as the reference pattern for other list pages. Minor tweak: convert static filter chips into real controls only when filtering exists.

Split recommendation:

No.

### `/notifications` - Partially Matches

Evidence:

- Route is correctly outside the left nav and uses an account-inbox operational shell at `apps/web/app/(authenticated)/notifications/page.tsx:27` to `:99`.
- Inner panel still uses a full `ForgeSurface` and grouped card list at `apps/web/components/notifications-panel.tsx:94` to `:158`.

Why it still feels heavier than needed:

Notifications are now secondary account context, but the route still gets a full metric strip and large grouped cards.

Optimization:

Make this a lighter inbox: toolbar, compact list/table, optional drawer. Remove the metric strip unless unread/action counts become truly useful.

Split recommendation:

No.

### `/settings` - Partially Matches

Evidence:

- Internal settings subnav and organization drawer are correct at `apps/web/app/(authenticated)/settings/page.tsx:115` to `:210`.
- The default page also mounts the account panel inline at `apps/web/app/(authenticated)/settings/page.tsx:180` to `:193`.

Why it still feels a little busy:

The landing page is both a settings map and an account edit page. That creates two jobs.

Optimization:

Either make `/settings` a compact map only, or make it Account only and use the subnav for the rest. Avoid both on the same default screen.

Split recommendation:

No new route required. Choose one default job.

### `/settings/people` - Partially Matches

Evidence:

- Settings detail wrapper is correct at `apps/web/app/(authenticated)/settings/people/page.tsx`.
- Inner `PeoplePanel` nests a `ForgeWorkspaceLayout` with an invite rail at `apps/web/components/settings/people-panel.tsx:395`.
- Invite controls are a full rail at `apps/web/components/settings/people-panel.tsx:157` to `:315`.

Why it still feels convoluted:

The generated Settings People Stitch screen expects one settings subnav, one member table, and one status/invite drawer. The current implementation adds another rail inside that structure.

Optimization:

Flatten `PeoplePanel` into the settings main panel. Put invite/pending invite state into the existing Settings drawer or a modal.

Split recommendation:

Not if simplified.

### `/settings/teams` - Does Not Match

Evidence:

- Inner component uses `ForgeWorkspaceLayout` with create/select team rail at `apps/web/components/settings/teams-panel.tsx:520` and `:605`.
- It includes create team controls, selected team controls, membership tables, and role assignment surfaces in one page at `apps/web/components/settings/teams-panel.tsx:527` to `:823`.

Why it feels convoluted:

The Settings shell already provides navigation and status context. The Teams panel adds another control rail and multiple management jobs.

Optimization:

Default to a team table. Use the drawer for selected team and create/edit actions. Move membership editing into a focused modal/drawer when a team is selected.

Split recommendation:

Maybe. Try simplifying first; split only if membership editing remains too large.

### `/settings/permissions` - Does Not Match

Evidence:

- Inner component uses another rail layout at `apps/web/components/settings/permissions-panel.tsx:367` to `:448`.
- It stacks preset assignment and primary manager assignment sections at `apps/web/components/settings/permissions-panel.tsx:449` to `:713`.

Why it feels convoluted:

The default page contains multiple admin jobs: choose team, inspect presets, assign presets, assign primary managers, and read counts.

Optimization:

Make one matrix the primary page. Use the drawer for team context and preset status. Move primary manager assignment to `/settings/teams` or a dedicated Permissions subview.

Split recommendation:

Yes. At minimum, split preset assignment and primary manager assignment into true views.

### `/settings/integrations` - Partially Matches

Evidence:

- Settings detail shell is correct at `apps/web/app/(authenticated)/settings/integrations/page.tsx:28` to `:64`.
- Inner panel uses two provider cards at `apps/web/components/integrations-settings-panel.tsx:141` to `:150`.

Why it still can be simpler:

Cards are acceptable with only two providers, but Stitch wants dense operational rows for settings pages. A provider status table will scale better.

Optimization:

Convert provider cards into a compact table with Provider, Status, Last event, Webhooks, Action. Put setup details in the drawer.

Split recommendation:

No.

### `/settings/rubric` - Does Not Match

Evidence:

- Inner `RubricsPanel` uses two rails plus a main editor at `apps/web/components/settings/rubrics-panel.tsx:478` to `:1079`.
- The same default surface contains active version, source options, clone/import, version history, category editor, validation issues, server draft, and publish controls.

Why it feels convoluted:

This is a full builder embedded as a settings overview. It is too much for the default Settings rubric page and directly conflicts with the Stitch rule for `/settings/rubric`: review active rubric first, then start a focused edit.

Optimization:

Make `/settings/rubric` an overview: active rubric, category weights table, version history, and one "Edit rubric" action. Move the builder into `/settings/rubric/edit`, a modal, or a dedicated mode route.

Split recommendation:

Yes.

### `/settings/compliance` - Partially Matches

Evidence:

- Settings detail shell is correct through the route wrapper.
- Inner compliance UI still uses older `ForgeSurface` sections at `apps/web/components/settings/compliance-panel.tsx:62` and `:151`.

Why it still feels slightly off:

The page job is clear, but the visual structure does not fully match the Settings detail table/status-row pattern.

Optimization:

Convert compliance content into status rows: Recording consent, Retention, Safeguards, Audit status. Use the right drawer for policy detail.

Split recommendation:

No.

## Recommended Implementation Order

1. Dashboard: remove duplicate metrics and convert to a "Today" operational queue.
2. Training: make default learner-first and move manager/builder flows out of the default surface.
3. Roleplay: collapse from bookend rails into one practice stage plus score drawer.
4. Settings Rubric: separate overview from builder.
5. Settings Permissions and Teams: flatten nested rails into tables plus drawer.
6. Team and Rep Profile: remove extra cards/columns and use the selected-rep drawer more heavily.
7. Calls, Upload, Notifications: light polish.
8. Visual QA across desktop and mobile.

## Bottom Line

Yes, splitting is worth it for the overwhelming pages, but not everywhere. The primary fix is not more pages by default. The primary fix is enforcing the Stitch layout contract: one page, one primary job, one main work surface, and one support drawer.
