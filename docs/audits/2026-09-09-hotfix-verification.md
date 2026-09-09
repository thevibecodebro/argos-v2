# Admin, roleplay and upload hotfix verification

Status: implemented and verified locally on 2026-09-09. Not pushed or deployed; no production database changes or live provider calls.

## Changes

- Admin workspace selection is recovered from active staff identity when an impersonation session is absent or expired, retaining the existing MFA gate. Dashboard wording is now Argos Admin Dashboard.
- Upload prepare/completion bind the attempt to its original organization. An account switch cannot finalize it under another organization.
- Retry keeps a successfully transferred object and repeats completion idempotently. Expired targets can be renewed only for the original organization. This recovery applies to the current browser queue; it does not persist File objects across a page reload.
- Managed account processing retries use the same server-verified entitlement as upload, while legacy subscription checks remain.
- Voice accounting uses server-recorded active intervals, rounded once per session, with idempotent minute ledger keys. Pauses are excluded; abandoned connections are capped by a 30-second lease. Existing sessions without intervals receive no inferred retrospective charges.
- Stopping, leaving, or switching roleplay sessions closes local media and invalidates pending microphone and SDP results.
- Worker claim failures retry after a delay. Health returns 503 until successful polling and during an outage, then recovers to 200.

## Verification

`npm run verify` exited 0:

- Database, web and worker TypeScript checks passed.
- Web: 1,221 tests passed, including three mounted RoleplayPanel lifecycle regressions with simulated media/provider responses.
- Next.js production build passed.
- Worker: 80 tests passed; 19 database-dependent tests skipped because the local Docker database was unavailable.
- `git diff --check` passed.

Additional isolated PGlite verification executed the actual additive migration and Drizzle voice repository: seven checks passed for immutable stops, cancellation before start, lease expiry, database-clock renewal, RPC expiry enforcement, and denial of table/RPC access to anon and authenticated roles. This used a minimal fixture schema, not a full Supabase environment. The temporary harness is outside the repository and is not part of CI.

Independent code review found no remaining blocker in the six reviewed fixes. This does not establish live microphone/WebRTC behavior, production Supabase integration, or real upload delivery.

## Release order

1. Apply `supabase/migrations/20260909040320_roleplay_voice_segments.sql` before deploying the web change.
2. Deploy web and worker changes.
3. Verify admin reopen/account switching, upload completion/retry, roleplay pause/resume/exit, and worker health in the deployed environment.

The migration is additive. The application uses authorized server access; direct browser roles cannot access the new interval table or renewal RPC. Further timing details are in `apps/web/lib/roleplay/VOICE-HOTFIX.md`.
