## Goal

Replace transcript-length duration estimates for roleplay sessions with real measured timing that survives normal completion, interrupted sessions, and realtime voice teardown.

## Scope

1. Add persistent timing fields to roleplay sessions.
2. Update roleplay services and routes to record start, activity, close, and completion timing.
3. Remove transcript-length duration heuristics from the UI and use stored duration data.
4. Keep reads backward-compatible for older sessions without measured timing.
5. Add targeted tests for completion, interruption, realtime close, and UI rendering.

## Execution Plan

1. Add failing tests for:
   - normal session completion stores end timestamp and real duration
   - interrupted session close stores end timestamp and real duration without requiring a scorecard
   - realtime close route persists measured duration
   - roleplay history UI renders stored duration and does not fall back to transcript length
2. Extend the roleplay schema, types, and repositories with:
   - `startedAt`
   - `lastActivityAt`
   - `endedAt`
   - `durationSeconds`
3. Update roleplay service flows:
   - initialize timing on create
   - refresh activity timing on message append
   - compute final duration on completion
   - add a close operation for interrupted or realtime shutdown paths
4. Update API surface and generated types if public session payloads change.
5. Add a migration with safe defaults for existing rows and keep serialization backward-compatible.
6. Run targeted tests, regenerate types if needed, typecheck, and inspect change scope before final handoff.
