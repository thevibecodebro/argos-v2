# How Argos Keeps Organizations Separate

Last reviewed: 2026-06-17

## Short version

Argos is set up as a multi-organization product. Each customer organization has its own organization record, and customer-owned data is tied back to that organization with an `org_id`.

For normal users, the database checks the user's organization before returning rows. If a user belongs to Organization A, the database policies are designed to only expose rows that belong to Organization A.

Super admins are handled separately. They are not normal customer admins inside every organization. They enter through the platform staff system, start a temporary session for one target organization, and that access is recorded with a reason and audit trail.

## The main idea

Think of `organizations` as the container for customer data.

Most important tables either:

- have an `org_id` column directly, or
- point to a parent record that has an `org_id`.

Examples:

- `users.org_id` says which organization a user belongs to.
- `calls.org_id` says which organization owns a call.
- `teams.org_id` says which organization owns a team.
- `training_modules.org_id`, `roleplay_sessions.org_id`, integrations, invites, audit events, and billing records are also tied to an organization.

This means the database has a tenant boundary baked into the data model.

## Normal customer access

When a regular user signs in, Supabase knows their authenticated user ID. Argos stores the matching app user in `public.users`.

The database helper `current_user_org_id()` looks up the signed-in user's `org_id`.

Then Row Level Security policies use that value to filter data. In plain English, those policies say:

> Only let this user see or manage rows for their own organization.

So if a user from Organization A asks for calls, users, teams, training modules, integrations, or other org-owned records, the database policy checks whether those rows match Organization A.

## Row Level Security

Row Level Security, or RLS, is the database layer that prevents normal authenticated users from reading rows they should not see.

Argos enables RLS on tenant-facing tables such as:

- `organizations`
- `users`
- `calls`
- `teams`
- `team_memberships`
- `rep_manager_assignments`
- `team_permission_grants`
- `call_moments`
- `call_annotations`
- `training_modules`
- `training_progress`
- `roleplay_sessions`
- `org_compliance`
- `zoom_integrations`
- `ghl_integrations`
- `rubrics`
- `rubric_categories`
- `call_scores`

Some rows do not carry `org_id` directly. For example, a call annotation points to a call, and the call belongs to an organization. In those cases, the policy checks the parent call before allowing access.

## Database constraints

Argos also uses database constraints to avoid cross-organization relationships by mistake.

For team access, the database does not only store `team_id` and `user_id`. It also stores `org_id`, then uses compound foreign keys.

That matters because it prevents invalid combinations like:

- a user from Organization A being added to a team from Organization B
- a manager from Organization A being assigned to a rep from Organization B
- a permission grant connecting a user and team from different organizations

This is stronger than relying only on application code.

## Roles inside an organization

The organization boundary comes first. After that, Argos applies role and team rules inside the organization.

Normal customer roles are:

- `rep`
- `manager`
- `executive`
- `admin`

In plain English:

- Reps usually see their own work.
- Managers see reps or teams they have permission to manage.
- Executives and admins can see broader organization-level data.
- Admins can manage organization-level settings and membership.

These roles do not let a customer user cross into another organization.

## Privileged server-side code

Some backend code runs with stronger database credentials than a normal browser user.

Examples include:

- API routes
- background workers
- webhook handlers
- storage helpers
- platform admin actions

This code may use `DATABASE_URL` or the Supabase service role key. Those credentials can bypass normal RLS protections.

That does not mean every user gets extra access. It means the trusted server code must enforce the organization boundary itself.

The safe pattern is:

1. Authenticate the user.
2. Load the app user record.
3. Get the user's `org_id`.
4. Query or mutate data only for that `org_id`.
5. Reject requests where the requested record belongs to a different organization.

For example, call detail access loads the call and rejects it if the call's `org_id` does not match the viewer's organization.

## Super admins and platform staff

Super admins are handled through the platform staff model.

In the database, platform staff live in separate tables:

- `platform_staff`
- `platform_access_sessions`
- `platform_audit_events`

Platform staff are not simply made admins in every customer organization.

Instead, a platform staff member must:

1. Sign in with Supabase.
2. Be listed as active platform staff.
3. Pass the platform access checks, including MFA/AAL2 where required.
4. Start a platform access session for one target organization.
5. Provide or inherit a reason for that access.

That session stores:

- which staff user is acting
- which organization they are targeting
- why they are entering
- when the session started
- when it expires
- whether it is active, ended, or expired

Platform audit events then record actions with staff and organization snapshots.

In plain English: super admins have a controlled support/admin lane. They can temporarily act against one selected customer organization, and that access is supposed to be explicit, time-bound, and auditable.

## What this protects against

This setup is designed to protect against:

- a normal user reading another organization's rows
- a manager managing reps in another organization
- a team membership accidentally joining records from different organizations
- a customer admin becoming an admin across all customers
- platform staff access being mixed into normal customer roles

## What engineers need to watch for

When adding or changing database-backed features, check these items:

- Does the table need an `org_id`?
- If it does not have `org_id`, does it point to a parent row that has one?
- Is RLS enabled if the table is exposed to authenticated users?
- Do policies compare against `current_user_org_id()` or an equivalent org-safe helper?
- Do inserts and updates have `with check` policies, not just read policies?
- Does server-side code filter by the viewer's organization before returning data?
- Does any platform staff path create an access session and audit event?
- Are platform staff kept separate from customer roles?
- Is the service role key kept server-only and never exposed to browser code?

## Source map

Key schema and policy files:

- `supabase/migrations/202603280001_initial_schema.sql`
- `supabase/migrations/202604030002_fix_recursive_users_rls.sql`
- `supabase/migrations/202604050001_team_access_permissions.sql`
- `supabase/migrations/202604050002_team_access_policies.sql`
- `supabase/migrations/202604280003_rls_policy_hardening.sql`
- `supabase/migrations/202606110001_platform_admin.sql`

Key app code:

- `apps/web/lib/calls/service.ts`
- `apps/web/lib/access/service.ts`
- `apps/web/lib/platform/auth.ts`
- `apps/web/lib/platform/effective-actor.ts`
- `apps/web/lib/supabase/admin.ts`
- `apps/web/lib/supabase/server.ts`
