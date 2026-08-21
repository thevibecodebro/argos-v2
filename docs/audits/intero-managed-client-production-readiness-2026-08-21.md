# Intero Managed Google Tenant Vault — Production Readiness Save Point

Date: 2026-08-21

Status: release candidate; not deployed to production

Save point tag: `intero-managed-google-tenant-vault-release-candidate-2026-08-21`

Release branch: `codex/managed-client-intero-pilot`

Production baseline: `7060a7406ecf757d90a823e194b0eb62b8d61ac5`

## Release contract

- Managed organizations are created only by active platform owners or operators.
- Managed feature capabilities are set only from the platform console and are enforced on server routes as well as hidden from tenant UI.
- An organization can begin with one active department rubric track and add a second without changing the tenant model.
- Tenant-owned records remain scoped by `org_id`, database row-level security, and service-layer organization checks.
- Managed initial-admin and member invites use Google-only login links.
- Managed invite acceptance fails closed unless verified Supabase JWT claims show the Google provider and the `oauth` authentication method.
- Legacy organizations and existing platform staff retain their existing authentication path. This avoids locking out the two active platform staff identities that currently use email authentication.

## Verified release evidence

- Full repository verification passed under the repository's Node 24 runtime:
  - database typecheck
  - web typecheck
  - 182 web test files and 1,121 tests
  - production Next.js build
  - worker typecheck
  - 19 worker test files, 81 tests total; 19 database-dependent tests skipped in the root run
- The managed-client database isolation suite previously passed against the local Supabase stack, including cross-organization read and write denials.
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
   - Supabase Security Advisor still reports zero errors.
6. Promote the exact reviewed Vercel deployment.
7. Smoke-test `/api/health`, `/login`, `/platform/organizations`, and a managed Google invite.
8. Create two disposable managed organizations, A and B. With authenticated users from each organization, verify that calls, recordings, rubrics, training, roleplay, teams, grants, and integrations from the other organization return `403`, `404`, or an empty result as appropriate. Verify cross-tenant writes fail.
9. Verify a managed invite cannot be accepted from an email magic-link session and succeeds through Google OAuth using the invited email.
10. Only after steps 1–9 pass, create the Intero managed organization and its initial admin invite from the platform console.

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
