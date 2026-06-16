# Authenticated Page Readability Verification - 2026-06-15

## Scope

Navigation unchanged. Page readability optimized across settings, roleplay, call detail, and remaining authenticated routes.

## Automated Verification

- Focused route tests: PASS - `focused-route-readability`, `coaching-team-readability`, `remaining-route-readability`, and `primary-route-hero-removal` passed.
- Settings readability tests: PASS - `settings-readability-contract` and `settings-nav` passed.
- Roleplay readability tests: PASS - `roleplay-readability-contract`, `roleplay-panel`, and related route readability tests passed.
- Call detail readability tests: PASS - `call-detail-readability-contract`, `call-detail-panel`, `call-detail-page-forge`, `generate-roleplay-route`, and `roleplay/generate-from-call` passed.
- Full authenticated readability lane: PASS - 15 test files and 81 tests passed.
- Calls mobile overflow regression: PASS - `calls-filters-forge` guards mobile call cards with `min-w-0`.
- Typecheck: PASS - `npm run typecheck -w @argos-v2/web`.
- git diff --check: PASS.
- Metric strip route scan: PASS - no `OperationalMetricStrip` references remain under authenticated route pages.

## Browser Verification

- Dashboard: PASS - authenticated local session loaded `/dashboard` with `data-dashboard-route="dashboard"` and no real horizontal overflow.
- Settings: PASS - authenticated local session loaded `/settings`, `/settings/people`, and `/settings/rubric` with settings route/workbench markers and no real horizontal overflow.
- Roleplay: PASS - authenticated local session loaded `/roleplay` with `data-roleplay-workspace="simple-practice"` and no real horizontal overflow.
- Call Detail: BLOCKED - local Calls data did not expose a call-detail anchor during smoke; call detail remains covered by server-render/source tests.
- Calls: PASS - authenticated local session loaded `/calls` with `data-calls-layout="table-first"` and no real horizontal overflow after the mobile call-card fix.
- Team: PASS - authenticated local session loaded `/team` with `data-team-route="roster-first"` and no real horizontal overflow.
- Leaderboard: PASS - authenticated local session loaded `/leaderboard` with `data-leaderboard-route="rank-table"` and no real horizontal overflow.

## Auth Notes

Initial smoke without local env failed in middleware with `Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL` because the clean worktree does not have `apps/web/.env.local`.

The dev server was restarted with the main checkout's local env loaded into the process. Auth middleware then worked, but the in-app browser had no authenticated local session and redirected protected routes to the login page. Visual authenticated smoke still requires logging into the local app.

After the user logged into the local browser session, the protected route smoke was rerun successfully for the major pages above. Production/preview should still include one authenticated call-detail URL smoke when a seeded call id is available.
