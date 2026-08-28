# Intero Production Tenant Vault — Isolation-Verified Save Point

Date: 2026-08-21

Status: managed-client foundation live in production; Intero provisioning awaits the initial admin Google email

Save point tag: `intero-production-tenant-vault-isolation-verified-2026-08-21`

Release branch: `codex/managed-client-intero-pilot`

Production baseline: `7060a7406ecf757d90a823e194b0eb62b8d61ac5`

Production application commit: `a32561472d81e68c1f9ebb0ffab75e36c7b28260`

Production isolation migration commit: `4fff5f9d1f3f0a4c839a663e23e6e78de3d7f36a`

## Release contract

- Managed organizations are created only by active platform owners or operators.
- Managed feature capabilities are set only from the platform console and are enforced on server routes as well as hidden from tenant UI.
- An organization can begin with one active department rubric track and add a second without changing the tenant model.
- Tenant-owned records remain scoped by `org_id`, database row-level security, and service-layer organization checks.
- Managed initial-admin and member invites use Google-only login links.
- Managed invite acceptance fails closed unless verified Supabase JWT claims show the Google provider and the `oauth` authentication method.
- Managed invite acceptance also rejects sessions linked to any non-Google social OAuth identity.
- The application still preserves legacy organization routing, but hosted email/password sign-in is disabled for this launch; active users sign in through Google.

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
- Roleplay reads require both the current `org_id` and permitted rep scope. A production two-tenant smoke test exposed the missing organization predicate before Intero was created; migration `20260821160729_roleplay_session_select_org_scope.sql` closed it.

## Verified release evidence

- Full repository verification passed under the repository's Node 24 runtime after the production isolation fix:
  - database typecheck
  - web typecheck
  - 182 web test files and 1,134 tests
  - production Next.js build
  - worker typecheck
  - 19 worker test files and 85 tests, including all database-dependent suites
- A clean local Supabase database reset applied the full migration history, including both managed-client migrations, from an empty database without error.
- Database-backed verification passed against local Supabase:
  - managed-client isolation: 9 tests
  - row-level security policies: 13 tests
  - call repository isolation and capability enforcement: 8 tests
  - GHL repository isolation and capability enforcement: 4 tests
- The database-backed suites confirmed cross-organization read and write denials. The RLS suite passed 13/13 on its isolated rerun after one parallel test-harness collision produced PostgreSQL `tuple concurrently updated` during concurrent privilege setup.
- The hosted Supabase project was active and healthy on PostgreSQL 17.6 during readiness inspection.
- Hosted migration history matches the repository through `20260821160729_roleplay_session_select_org_scope.sql`.
- Hosted data preconditions were clean: no organization had multiple active rubrics, no rubric lacked an organization, and no duplicate organization/version rubric pairs existed.
- A hosted two-managed-tenant transaction verified isolation for organizations, calls and recording references, training, roleplay, teams, rubrics, access grants, capabilities, and Zoom/GHL integrations. Cross-tenant writes failed, and the transaction rolled back with zero disposable organizations persisted.
- Supabase Security Advisor reports zero errors. Its one warning is leaked-password protection being disabled; managed invite acceptance does not use password authentication.
- Vercel production is deployment `dpl_GGgcpUB3kJH325yLGvPWMD3VuhGm`, application commit `a32561472d81e68c1f9ebb0ffab75e36c7b28260`, and is `READY`.
- Production smoke tests passed for `/api/health`, `/login`, `/platform/organizations`, and the unauthenticated platform API boundary. Deployment-scoped runtime logs showed no errors after the probes.

## Production actions completed

1. Applied the additive managed-client migration after a one-migration dry run.
2. Promoted the exact reviewed Vercel artifact and verified its production aliases.
3. Confirmed Google is the only enabled Supabase external provider; email/password authentication is disabled.
4. Applied the roleplay tenant-isolation hotfix after reproducing the defect in a rollback-only production transaction.
5. Re-ran the full production two-tenant isolation transaction successfully with zero test records persisted.
6. Re-ran Supabase Security Advisor and production health/auth-boundary probes.

## Remaining provisioning gate

1. Obtain the exact Google email for Intero's initial administrator. Do not guess it; creation immediately sends the invite.
2. Sign in as an active platform owner/operator and create the `intero` managed organization from the platform console.
3. Apply the Intero practice-pilot capability preset from the platform organization page and record the business reason.
4. Create the first department/rubric track. Add the second as a separate track when Intero is ready.
5. Accept the invite through Google OAuth and run authenticated application-level tenant and capability smoke tests.

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

## Remaining input boundary

The production foundation and isolation fixes are live. The real Intero organization has not been created because its initial administrator Google email is not recorded in the repository or prior release context, and the creation workflow sends that address an invitation immediately.
