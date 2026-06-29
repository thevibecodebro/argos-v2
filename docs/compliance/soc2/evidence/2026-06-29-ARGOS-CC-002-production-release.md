# Production Release Evidence Packet

Date collected: 2026-06-29T16:02:22.618Z
Collector: thevibecodebro
Control IDs: ARGOS-CC-002, ARGOS-CC-003, ARGOS-CC-004

## Local Repository State

| Evidence | Result |
| --- | --- |
| Git branch | codex/soc2-remediation-0-5-plan |
| Git commit | d82ba363fcefa9ed82847eb7600636d066469b00 |
| Git status | Non-empty: M package.json; ?? scripts/ |

## Verification Scripts Present

| Script | Command |
| --- | --- |
| build:web | `npm run build -w @argos-v2/web` |
| test:web | `npm run test -w @argos-v2/web` |
| test:worker | `npm run test -w @argos-v2/worker` |
| typecheck:db | `npm run typecheck -w @argos-v2/db` |
| typecheck:web | `npm run typecheck -w @argos-v2/web` |
| typecheck:worker | `npm run typecheck -w @argos-v2/worker` |
| verify:db | `npm run typecheck:db` |
| verify:web | `npm run typecheck:web && npm run test:web && npm run build:web` |
| verify:worker | `npm run typecheck:worker && npm run test:worker` |
| verify | `npm run verify:db && npm run verify:web && npm run verify:worker` |

## Latest Supabase Migrations In Repo

- 202606230004_call_child_write_rls.sql
- 202606230005_ghl_user_mapping_org_boundary.sql
- 202606240001_ghl_invalid_recording_filename_skip_reason.sql
- 202606240002_ghl_location_id_unique.sql
- 202606240003_zoom_account_id_unique.sql
- 202606240004_ghl_billing_inactive_skip_reason.sql
- 202606250001_organization_archive.sql
- 202606250002_manual_upload_source_storage_path_unique.sql
- 20260626041647_training_progress_module_assignment_rls.sql
- 20260626070500_roleplay_mutation_authz.sql

## Manual Evidence To Attach

| Required Evidence | Source System | Result |
| --- | --- | --- |
| Vercel production deployment SHA matches Git commit | Vercel |  |
| Vercel production env inventory reviewed without secret values | Vercel |  |
| Fly worker release matches intended image/config | Fly |  |
| Fly worker production env labels reviewed without secret values | Fly |  |
| Hosted Supabase migration list matches repo migrations | Supabase |  |
| Hosted Supabase Auth signup/provider/redirect settings reviewed | Supabase |  |
| Supabase private storage bucket settings reviewed | Supabase |  |
| Stripe webhook delivery tested after release | Stripe |  |
| Zoom webhook delivery tested after release | Zoom |  |
| GoHighLevel webhook delivery tested after release | GoHighLevel |  |
| OpenAI account retention/training settings reviewed | OpenAI |  |
| Auth callback smoke test completed | Browser or Playwright |  |
| Invite-only negative signup test completed | Browser or Playwright |  |
| Rollback deployment identified | Vercel/Fly/GitHub |  |

## Exceptions

| Exception | Severity | Owner | Remediation Date |
| --- | --- | --- | --- |

## Signoff

Release owner:
Reviewer:
