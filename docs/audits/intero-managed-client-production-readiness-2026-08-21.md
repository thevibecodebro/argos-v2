# Intero Platform-Locked Tenant Vault — Security-Hardened Release Save Point

Date: 2026-08-21

Status: security-hardened release candidate; not deployed to production

Save point tag: `intero-platform-locked-tenant-vault-security-hardened-2026-08-21`

Release branch: `codex/managed-client-intero-pilot`

Production baseline: `7060a7406ecf757d90a823e194b0eb62b8d61ac5`

## Release contract

- Managed organizations are created only by active platform owners or operators.
- Managed feature capabilities are set only from the platform console and are enforced on server routes as well as hidden from tenant UI.
- An organization can begin with one active department rubric track and add a second without changing the tenant model.
- Tenant-owned records remain scoped by `org_id`, database row-level security, and service-layer organization checks.
- Managed initial-admin and member invites use Google-only login links.
- Managed invite acceptance fails closed unless verified Supabase JWT claims show the Google provider and the `oauth` authentication method.
- Managed invite acceptance also rejects sessions linked to any non-Google social OAuth identity.
- Legacy organizations and existing platform staff retain their existing authentication path. This avoids locking out the two active platform staff identities that currently use email authentication.

## Security hardening included in this save point

- Capability enforcement covers pages, API routes, background workers, OAuth callbacks, webhooks, queued call processing, and tenant UI—not only navigation visibility.
- Saving a managed access grant atomically changes the organization to the `managed` access model, preventing a legacy-entitlement gap.
- Stripe subscription state cannot restore a capability denied by a managed grant.
- Custom-scenario generation, team rubrics, roleplay voice, practice reporting, highlights, call analytics, and call scoring each fail closed when disabled.
- Tenant-authenticated database roles cannot insert, update, delete, or publish rubric definitions; rubric management is platform-controlled through the service role.
- Google Meet, GHL, and Zoom callback and ingestion flows recheck capability immediately before durable writes, preventing in-flight revocation races from restoring tokens or ingesting data.
- Queued scoring and integration work rechecks capability before provider access and again before durable persistence.
- Roleplay session reads default to the authenticated rep; cross-rep practice data requires `practice_reporting`.
- Call highlights are redacted from both API and server-rendered detail data unless `call_highlights` is enabled.

## Verified release evidence

- Full repository verification passed under the repository's Node 24 runtime:
  - database typecheck
  - web typecheck
  - 182 web test files and 1,131 tests
  - production Next.js build
  - worker typecheck
  - 18 passing worker test files and one database-dependent file skipped in the root run; 65 tests passed and 19 database-dependent tests skipped
- A clean local Supabase database reset applied the full migration history, including the edited managed-client migration, from an empty database without error.
- Database-backed verification passed against local Supabase:
  - managed-client isolation: 8 tests
  - row-level security policies: 13 tests
  - call repository isolation and capability enforcement: 8 tests
  - GHL repository isolation and capability enforcement: 4 tests
- The database-backed suites confirmed cross-organization read and write denials. The RLS suite passed 13/13 on its isolated rerun after one parallel test-harness collision produced PostgreSQL `tuple concurrently updated` during concurrent privilege setup.
- The hosted Supabase project was active and healthy on PostgreSQL 17.6 during readiness inspection.
- Hosted migration history matched the repository through `20260727213426`; the only pending migration was `20260820180510_managed_client_capabilities_and_rubric_tracks.sql`.
- Hosted data preconditions were clean: no organization had multiple active rubrics, no rubric lacked an organization, and no duplicate organization/version rubric pairs existed.
- Supabase Security Advisor reported no errors. Its one warning was leaked-password protection being disabled; managed invite acceptance does not use password authentication.
- Vercel production remains on deployment `dpl_Cw5NvRgvHc95MH9rqQCeJkqr9bmN`, commit `7060a7406ecf757d90a823e194b0eb62b8d61ac5`, and is `READY`.

## Required production sequence

Stop if any command shows additional migration drift, a different production baseline, or failed checks.

1. Merge or promote only the exact reviewed release commit from this branch.
2. Refresh `SUPABASE_DB_PASSWORD` locally. Do not store it in the repository or paste it into an issue or pull request.
3. Reconfirm the migration plan:

   ```sh
   npx supabase migration list --linked
   npx supabase db push --linked --dry-run
   ```

   The dry run must list only `20260820180510_managed_client_capabilities_and_rubric_tracks.sql`.

4. Apply the one migration:

   ```sh
   npx supabase db push --linked
   npx supabase migration list --linked
   ```

5. Read back the hosted schema before application promotion:
   - `organizations.access_model` exists and defaults to `legacy`.
   - managed access-grant and capability tables exist with RLS enabled.
   - rubric track/version constraints and organization-scoped policies exist.
   - authenticated and anonymous roles cannot mutate `rubrics` or `rubric_categories`; only `service_role` retains those mutation privileges.
   - Supabase Security Advisor still reports zero errors.
6. Promote the exact reviewed Vercel deployment.
7. Confirm Supabase Auth has Google enabled. For the managed launch, disable other social OAuth providers. Email authentication may remain available for legacy organizations and platform staff because managed invite acceptance rejects it.
8. Smoke-test `/api/health`, `/login`, `/platform/organizations`, and a managed Google invite.
9. Create two disposable managed organizations, A and B. With authenticated users from each organization, verify that calls, recordings, rubrics, training, roleplay, teams, grants, and integrations from the other organization return `403`, `404`, or an empty result as appropriate. Verify cross-tenant writes fail.
10. Verify a managed invite cannot be accepted from an email magic-link session, rejects a session linked to another social provider, and succeeds through Google OAuth using the invited email.
11. Only after steps 1–10 pass, create the Intero managed organization and its initial admin invite from the platform console.

## Initial Intero configuration

- Access model: `managed`
- Initial departments: one
- Near-term structure: add a second department as a separate active rubric track when ready
- Initial enabled capabilities: training, roleplay, roleplay voice, custom scenarios, practice reporting, and workspace branding
- Initial disabled capabilities: call upload, call ingestion, call scoring, highlights, analytics, leaderboard, and provider integrations
- Capability changes: platform owner/operator only
- Authentication: Google OAuth only for managed invite acceptance

## Rollback

The database migration is additive and keeps existing organizations on `legacy`. Do not drop the new tables during an incident response; that would create unnecessary data-loss risk.

1. Pause new managed-organization creation.
2. Roll Vercel production back to deployment `dpl_Cw5NvRgvHc95MH9rqQCeJkqr9bmN` at commit `7060a7406ecf757d90a823e194b0eb62b8d61ac5`.
3. Leave the additive schema in place while diagnosing. The baseline application does not depend on or mutate the new managed-access tables.
4. Revoke active managed grants if access must be stopped immediately.
5. Re-run health, login, platform-staff access, and legacy-organization smoke tests.

Point-in-time recovery was not enabled during readiness inspection, and no hosted backup was listed. Current organizations are test accounts, but this remains a reason to prefer application rollback and grant revocation over destructive database reversal.

## Remaining authorization boundary

Preparing and publishing this release candidate does not authorize the hosted Supabase migration, Vercel production promotion, or creation of the real Intero organization. Those are the final production actions.
