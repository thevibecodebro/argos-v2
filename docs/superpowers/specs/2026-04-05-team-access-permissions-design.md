# Team Access And Permissions Design

Date: 2026-04-05
Status: Approved for planning

## Summary

Argos currently uses a flat org membership model with a single `role` on `users`. That is sufficient for rep versus manager-class behavior, but it does not support real sales-team structures where:

- a single org has multiple manager-led teams
- reps can belong to multiple teams at the same time
- managers only see the teams they manage
- executives and admins still operate org-wide
- the leaderboard remains org-wide as an intentional exception

This design introduces a future-proofed Option 2 model that can expand into a more granular Option 3 permission graph later without redesigning the product foundation.

## Goals

- Support multiple teams inside one organization
- Allow reps to belong to multiple teams simultaneously
- Allow multiple managers to co-manage the same team
- Keep one primary manager of record per rep for accountability
- Move manager access from hardcoded role checks to explicit permission grants
- Keep executive and admin visibility org-wide
- Keep the leaderboard org-wide for all org users to preserve competition across teams
- Make the system easy for the org admin to understand and configure
- Keep the data model extensible so finer-grained permissions can be added later

## Non-Goals

- Implement seat-based billing in this phase
- Design compensation plans, commission rules, or quota logic
- Build a fully arbitrary enterprise policy engine in the first release
- Redesign every existing product workflow in this document

## Current State

Today, Argos stores org membership and role directly on `users`, with no reporting or team structure. The app and database frequently treat `manager`, `executive`, and `admin` as a shared manager-class bucket. That works for org-wide access but not for scoped team ownership.

Current limitations:

- no teams
- no team membership mapping
- no team-level manager assignment
- no primary manager relationship
- no explicit permission grant layer
- repeated service and RLS checks that hardcode manager-class behavior

## Design Principles

1. Separate identity from access.
   Roles answer who a user is. Permissions answer what they can do.

2. Separate accountability from collaboration.
   A rep may belong to multiple teams, but one primary manager should remain accountable.

3. Prefer explicit grants over implicit inheritance.
   Manager access should come from grants, not just from the `manager` title.

4. Keep org-wide exceptions deliberate.
   The leaderboard should be globally visible because that is a product decision, not because access rules leaked.

5. Make Option 3 possible later.
   The first release should use a permission grant layer that can be expanded rather than replaced.

## Domain Model

### Roles

Roles remain high-level org identities:

- `admin`
- `executive`
- `manager`
- `rep`

Role meaning:

- `admin`: org owner or operator; can manage members, teams, grants, and future billing configuration
- `executive`: org-wide business visibility by default, but not necessarily org configuration authority
- `manager`: team-scoped operator; access is granted explicitly by team permissions
- `rep`: self-scoped user with personal access to their own data and assigned workflows

### Teams

Teams become first-class entities within an organization.

Examples:

- Appointment Setters
- Closers
- Enterprise Pod East
- Mid-Market Outbound

Each team belongs to one organization and has metadata such as:

- `id`
- `org_id`
- `name`
- `description`
- `status`
- `created_at`
- `updated_at`

### Team Memberships

Team membership is many-to-many.

A single user can belong to multiple teams. This is required for shared reps and cross-functional structures.

Membership record fields should include:

- `id`
- `org_id`
- `team_id`
- `user_id`
- `membership_type`
- `created_at`

`membership_type` should start with a small explicit set:

- `rep`
- `manager`

Executives and admins do not need team memberships to achieve org-wide visibility. They may still be attached to teams later for workflow reasons, but team membership should not be required for their baseline org-wide access.

### Primary Manager Of Record

Every rep should have one primary manager of record.

This relationship exists for accountability, not for access control. Managers may gain access through team grants, but the primary manager remains the default answer for:

- who is accountable for rep performance
- who is shown as the rep owner in profile views
- who is the default escalation target
- who is the default manager in future workflows that need a single owner

This should be modeled separately from team membership so it does not distort the collaborative team structure.

### Permission Grants

Manager access should be driven by explicit per-team permission grants.

Grant shape:

- `id`
- `org_id`
- `team_id`
- `user_id`
- `permission_key`
- `granted_by`
- `created_at`

Initial permission keys:

- `view_team_calls`
- `coach_team_calls`
- `manage_call_highlights`
- `view_team_training`
- `manage_team_training`
- `manage_team_roster`
- `view_team_analytics`

Reserved for later expansion:

- `view_team_roleplay`
- `manage_team_roleplay`
- `view_team_compliance`
- `manage_team_integrations`
- `view_leaderboard_drilldown`

This shape is intentionally Option 3 ready. The system can later support more permissions, permission presets, or policy composition without reworking the core relationships.

## Permission Model

### Rep

Reps can:

- view their own calls, annotations, highlights, training progress, roleplay sessions, notifications, and personal dashboard
- participate in multiple teams
- see the org-wide leaderboard

Reps cannot:

- view other reps' private data unless a later feature explicitly grants peer visibility
- manage team roster, team training, team highlights, org integrations, or org compliance

### Manager

Managers do not automatically get broad org-wide access because of the `manager` role alone.

Managers can:

- see and act on data for teams where they hold permission grants
- be attached to multiple teams
- co-manage the same team with other managers
- see the org-wide leaderboard

Managers cannot:

- see unrelated teams by default
- manage team functions they were not explicitly granted
- manage org membership globally unless they are also an admin

### Executive

Executives keep org-wide visibility across product data by default.

Executives can:

- view org-wide calls, analytics, training progress, and rep performance
- access org-wide dashboards
- see the org-wide leaderboard

Executives are not required to manage teams or hold team grants for baseline org-wide visibility.

Whether executives can also perform configuration actions should be conservative in the first release:

- org-wide visibility: yes
- org structure configuration: no by default
- team grants: no by default
- member role changes: no by default

This avoids collapsing `executive` into `admin`.

### Admin

Admins have org-wide visibility plus configuration authority.

Admins can:

- manage org members and roles
- create and archive teams
- assign team memberships
- assign primary managers of record
- grant and revoke manager permissions per team
- view org-wide dashboards and leaderboard
- manage integrations and org-level controls

## Data Visibility Rules

### Calls

Recommended first-release rule:

- a rep can see their own calls
- a manager can see calls for reps who belong to a team where the manager has `view_team_calls`
- an executive or admin can see all org calls

This avoids requiring every call to be team-tagged in the first release.

Tradeoff:

- if a rep belongs to multiple teams, multiple managers may see the same call

This is acceptable because the team model is collaborative and the primary manager relationship already handles accountability. If a future org needs stricter segmentation, calls can later gain optional team context without invalidating the base model.

### Coaching And Highlights

Coaching actions should be more tightly scoped than read access.

- view call detail: `view_team_calls`
- add coaching annotations: `coach_team_calls`
- manage highlights: `manage_call_highlights`

This prevents every manager who can read calls from automatically modifying coaching records.

### Training

Training should be team-aware from the first release.

Reason:

- training ownership is usually more operational than call visibility
- multiple managers need clean boundaries around assigned work

Training assignments and progress should support team context so the system can answer:

- which team assigned this module
- which manager assigned it
- which team owns follow-up on completion

### Roster

Roster management must always be team-specific.

Managers with `manage_team_roster` can:

- add and remove rep memberships for teams they manage
- update team composition inside their granted scope

Managers should not be able to change org roles or move users across unrelated teams unless explicitly granted later. Org membership and role authority remain admin responsibilities in the first release.

### Analytics

Analytics should respect the same scope rules:

- rep: self only
- manager: granted teams only
- executive: org-wide
- admin: org-wide

### Leaderboard

The leaderboard is an intentional org-wide exception.

All org users can see:

- leaderboard rankings
- basic comparative metrics used for competition

Recommended initial org-wide leaderboard data:

- rep name
- rank
- score
- call volume
- trend delta

Drill-down from leaderboard should still respect scoped access. A manager should not gain cross-team drill-down simply because the leaderboard itself is org-wide.

## Admin Experience

The model only works if the purchaser-admin can configure it quickly.

Recommended admin surfaces:

### 1. Members

Admin can:

- invite users
- change high-level roles
- assign primary manager of record for each rep

### 2. Teams

Admin can:

- create teams
- rename teams
- archive teams
- define descriptions or usage hints

### 3. Team Memberships

Admin can:

- add reps to one or more teams
- add managers to one or more teams
- see which reps belong to multiple teams

### 4. Permissions

Admin can:

- assign manager presets to a team
- override individual permissions when needed

Recommended presets:

- `Coach`
- `Training Manager`
- `Team Lead`

Preset behavior:

- presets are convenience defaults
- the system stores actual grants explicitly
- admins can override grants per manager per team

This keeps the UI simple without sacrificing future flexibility.

## Architecture Changes

### Application Layer

Introduce a centralized access-control service instead of repeated hardcoded manager-class checks.

Responsibilities:

- determine actor scope
- resolve team memberships
- resolve permission grants
- answer reusable questions such as:
  - can this actor view this rep
  - can this actor coach this call
  - can this actor manage training for this team
  - can this actor drill into this leaderboard row

The rest of the app should consume access answers rather than re-implement role logic.

### Database Layer

Add new relational structures for:

- teams
- team memberships
- primary manager assignment
- team permission grants

Existing product tables do not all need to be redesigned immediately, but access-sensitive queries will need to join against the new access model.

### RLS Strategy

Current RLS relies heavily on `current_user_role() in ('admin', 'manager', 'executive')`.

Future-ready RLS should evolve toward:

- org boundary enforcement as the base rule
- access-resolution helper functions that consult team membership and permission grants for manager-scoped access
- preserved org-wide rules for executive/admin visibility where intended

This does not require full Option 3 policy complexity in the first release, but it does require moving away from role-only manager checks.

## Migration Strategy

Recommended migration path:

1. Add teams, memberships, primary manager mapping, and permission grants tables.
2. Backfill a default team model for orgs that currently have only flat membership.
3. Preserve existing behavior for executive/admin during transition.
4. Move manager-facing services to centralized access checks.
5. Update RLS and repository queries to match the new scope rules.
6. Roll out admin configuration screens after the access model is stable.

Safe default for existing orgs:

- create one default team per org
- attach all current reps to that team
- attach all current managers to that team with broad preset grants

That preserves current behavior while enabling future team decomposition.

## Error Handling

Access failures should be explicit and consistent.

Examples:

- manager lacks team grant for the requested action
- manager attempts to view a rep outside granted teams
- training assignment references a team the actor cannot manage
- roster action targets a team outside manager scope
- leaderboard drill-down is requested without scoped visibility

Recommended product behavior:

- return `403` for forbidden actions
- return `404` when resource existence should not be disclosed
- provide admin-facing UI copy that explains missing grants when appropriate

## Testing Strategy

### Unit Tests

Add coverage for:

- access-resolution service
- team membership resolution
- primary manager assignment behavior
- permission grant checks
- leaderboard exception rules

### Integration Tests

Add coverage for:

- manager with access to one team only
- manager with access to multiple teams
- two managers co-managing one team
- rep belonging to multiple teams
- executive org-wide access
- admin configuration flows

### Regression Tests

Protect against:

- accidental org-wide manager visibility
- leaderboard drill-down leaking restricted data
- admin-only role changes becoming available to managers
- team-scoped training actions crossing into unauthorized teams

## Open Product Decisions Resolved In This Design

- Reps can belong to multiple manager-led teams at the same time.
- Managers should only see teams they manage.
- The leaderboard should remain org-wide.
- Multiple managers can co-manage the same team.
- Admins need a simple, explicit permission-management surface.
- The implementation should be future-proofed for a later Option 3 expansion.

## Recommendation

Implement Option 2 with Option 3-ready primitives:

- keep roles simple
- make teams first-class
- make memberships many-to-many
- keep one primary manager of record
- make manager power come from explicit grants
- centralize permission checks
- treat leaderboard as an explicit org-wide exception

This gives Argos a realistic sales-org model now without overbuilding a generalized enterprise policy system in the first release.
