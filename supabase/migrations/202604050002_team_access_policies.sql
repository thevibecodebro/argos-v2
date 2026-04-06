create or replace function public.current_user_is_org_wide()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'executive');
$$;

-- Calls and users intentionally keep org-wide select rules because the leaderboard is an
-- explicit product exception. The scoped product surfaces enforce drilldown in the app layer.

create or replace function public.current_user_can_see_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_org_wide()
    or exists (
      select 1
      from public.team_memberships memberships
      where memberships.org_id = public.current_user_org_id()
        and memberships.team_id = target_team_id
        and memberships.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.team_permission_grants grants
      where grants.org_id = public.current_user_org_id()
        and grants.user_id = auth.uid()
        and grants.team_id = target_team_id
    );
$$;

create or replace function public.current_user_can_read_rep_with_permissions(
  target_rep_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_rep_id = auth.uid()
    or public.current_user_is_org_wide()
    or (
      public.current_user_role() = 'manager'
      and exists (
        select 1
        from public.team_permission_grants grants
        join public.team_memberships rep_membership
          on rep_membership.org_id = grants.org_id
         and rep_membership.team_id = grants.team_id
         and rep_membership.user_id = target_rep_id
         and rep_membership.membership_type = 'rep'
        where grants.org_id = public.current_user_org_id()
          and grants.user_id = auth.uid()
          and grants.permission_key = any(required_permissions)
      )
    );
$$;

create or replace function public.current_user_can_write_rep_with_permissions(
  target_rep_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_rep_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'manager'
      and exists (
        select 1
        from public.team_permission_grants grants
        join public.team_memberships rep_membership
          on rep_membership.org_id = grants.org_id
         and rep_membership.team_id = grants.team_id
         and rep_membership.user_id = target_rep_id
         and rep_membership.membership_type = 'rep'
        where grants.org_id = public.current_user_org_id()
          and grants.user_id = auth.uid()
          and grants.permission_key = any(required_permissions)
      )
    );
$$;

create or replace function public.current_user_can_read_call_with_permissions(
  target_call_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calls call_row
    where call_row.id = target_call_id
      and call_row.org_id = public.current_user_org_id()
      and (
        public.current_user_is_org_wide()
        or public.current_user_can_read_rep_with_permissions(call_row.rep_id, required_permissions)
      )
  );
$$;

create or replace function public.current_user_can_write_call_with_permissions(
  target_call_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calls call_row
    where call_row.id = target_call_id
      and call_row.org_id = public.current_user_org_id()
      and (
        public.current_user_role() = 'admin'
        or public.current_user_can_write_rep_with_permissions(call_row.rep_id, required_permissions)
      )
  );
$$;

revoke all on function public.current_user_is_org_wide() from public;
grant execute on function public.current_user_is_org_wide() to authenticated;

revoke all on function public.current_user_can_see_team(uuid) from public;
grant execute on function public.current_user_can_see_team(uuid) to authenticated;

revoke all on function public.current_user_can_read_rep_with_permissions(uuid, text[]) from public;
grant execute on function public.current_user_can_read_rep_with_permissions(uuid, text[]) to authenticated;

revoke all on function public.current_user_can_write_rep_with_permissions(uuid, text[]) from public;
grant execute on function public.current_user_can_write_rep_with_permissions(uuid, text[]) to authenticated;

revoke all on function public.current_user_can_read_call_with_permissions(uuid, text[]) from public;
grant execute on function public.current_user_can_read_call_with_permissions(uuid, text[]) to authenticated;

revoke all on function public.current_user_can_write_call_with_permissions(uuid, text[]) from public;
grant execute on function public.current_user_can_write_call_with_permissions(uuid, text[]) to authenticated;

alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.rep_manager_assignments enable row level security;
alter table public.team_permission_grants enable row level security;
alter table public.call_moments enable row level security;
alter table public.call_annotations enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_progress enable row level security;
alter table public.roleplay_sessions enable row level security;
alter table public.org_compliance enable row level security;
alter table public.zoom_integrations enable row level security;
alter table public.ghl_integrations enable row level security;

drop policy if exists "teams_can_read_scope" on public.teams;
create policy "teams_can_read_scope" on public.teams
for select to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_can_see_team(id)
);

drop policy if exists "teams_admins_can_manage" on public.teams;
create policy "teams_admins_can_manage" on public.teams
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "team_memberships_can_read_scope" on public.team_memberships;
create policy "team_memberships_can_read_scope" on public.team_memberships
for select to authenticated
using (
  org_id = public.current_user_org_id()
  and (
    public.current_user_is_org_wide()
    or user_id = auth.uid()
    or public.current_user_can_see_team(team_id)
  )
);

drop policy if exists "team_memberships_admins_can_manage" on public.team_memberships;
create policy "team_memberships_admins_can_manage" on public.team_memberships
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and (
    public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'manager'
      and membership_type = 'rep'
      and exists (
        select 1
        from public.team_permission_grants grants
        where grants.org_id = public.current_user_org_id()
          and grants.user_id = auth.uid()
          and grants.team_id = team_id
          and grants.permission_key = 'manage_team_roster'
      )
    )
  )
)
with check (
  org_id = public.current_user_org_id()
  and (
    public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'manager'
      and membership_type = 'rep'
      and exists (
        select 1
        from public.team_permission_grants grants
        where grants.org_id = public.current_user_org_id()
          and grants.user_id = auth.uid()
          and grants.team_id = team_id
          and grants.permission_key = 'manage_team_roster'
      )
    )
  )
);

drop policy if exists "rep_manager_assignments_can_read_scope" on public.rep_manager_assignments;
create policy "rep_manager_assignments_can_read_scope" on public.rep_manager_assignments
for select to authenticated
using (
  org_id = public.current_user_org_id()
  and (
    public.current_user_is_org_wide()
    or rep_id = auth.uid()
    or manager_id = auth.uid()
    or public.current_user_can_read_rep_with_permissions(
      rep_id,
      ARRAY['view_team_calls', 'view_team_training', 'manage_team_training', 'view_team_analytics']::text[]
    )
  )
);

drop policy if exists "rep_manager_assignments_admins_can_manage" on public.rep_manager_assignments;
create policy "rep_manager_assignments_admins_can_manage" on public.rep_manager_assignments
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "team_permission_grants_can_read_scope" on public.team_permission_grants;
create policy "team_permission_grants_can_read_scope" on public.team_permission_grants
for select to authenticated
using (
  org_id = public.current_user_org_id()
  and (
    public.current_user_is_org_wide()
    or user_id = auth.uid()
  )
);

drop policy if exists "team_permission_grants_admins_can_manage" on public.team_permission_grants;
create policy "team_permission_grants_admins_can_manage" on public.team_permission_grants
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "org_members_can_read_call_moments" on public.call_moments;
drop policy if exists "managers_can_manage_call_moments" on public.call_moments;
drop policy if exists "call_moments_can_read_team_scope" on public.call_moments;
create policy "call_moments_can_read_team_scope" on public.call_moments
for select to authenticated
using (
  public.current_user_can_read_call_with_permissions(call_id, ARRAY['view_team_calls']::text[])
);

drop policy if exists "call_moments_can_write_team_scope" on public.call_moments;
create policy "call_moments_can_write_team_scope" on public.call_moments
for insert to authenticated
with check (
  public.current_user_role() = 'admin'
  or (
    public.current_user_role() = 'manager'
    and public.current_user_can_write_call_with_permissions(call_id, ARRAY['manage_call_highlights']::text[])
  )
);

drop policy if exists "call_moments_can_update_team_scope" on public.call_moments;
create policy "call_moments_can_update_team_scope" on public.call_moments
for update to authenticated
using (
  public.current_user_role() = 'admin'
  or (
    public.current_user_role() = 'manager'
    and public.current_user_can_write_call_with_permissions(call_id, ARRAY['manage_call_highlights']::text[])
  )
)
with check (
  public.current_user_role() = 'admin'
  or (
    public.current_user_role() = 'manager'
    and public.current_user_can_write_call_with_permissions(call_id, ARRAY['manage_call_highlights']::text[])
  )
);

drop policy if exists "call_moments_can_delete_team_scope" on public.call_moments;
create policy "call_moments_can_delete_team_scope" on public.call_moments
for delete to authenticated
using (
  public.current_user_role() = 'admin'
  or (
    public.current_user_role() = 'manager'
    and public.current_user_can_write_call_with_permissions(call_id, ARRAY['manage_call_highlights']::text[])
  )
);

drop policy if exists "org_members_can_read_call_annotations" on public.call_annotations;
drop policy if exists "org_members_can_create_call_annotations" on public.call_annotations;
drop policy if exists "authors_and_managers_can_delete_call_annotations" on public.call_annotations;
drop policy if exists "call_annotations_can_read_team_scope" on public.call_annotations;
create policy "call_annotations_can_read_team_scope" on public.call_annotations
for select to authenticated
using (
  public.current_user_can_read_call_with_permissions(call_id, ARRAY['view_team_calls']::text[])
);

drop policy if exists "call_annotations_can_write_team_scope" on public.call_annotations;
create policy "call_annotations_can_write_team_scope" on public.call_annotations
for insert to authenticated
with check (
  author_id = auth.uid()
  and public.current_user_can_write_call_with_permissions(call_id, ARRAY['coach_team_calls']::text[])
);

drop policy if exists "call_annotations_can_update_team_scope" on public.call_annotations;
create policy "call_annotations_can_update_team_scope" on public.call_annotations
for update to authenticated
using (
  author_id = auth.uid()
  or public.current_user_can_write_call_with_permissions(call_id, ARRAY['coach_team_calls']::text[])
)
with check (
  author_id = auth.uid()
  or public.current_user_can_write_call_with_permissions(call_id, ARRAY['coach_team_calls']::text[])
);

drop policy if exists "call_annotations_can_delete_team_scope" on public.call_annotations;
create policy "call_annotations_can_delete_team_scope" on public.call_annotations
for delete to authenticated
using (
  author_id = auth.uid()
  or public.current_user_can_write_call_with_permissions(call_id, ARRAY['coach_team_calls']::text[])
);

drop policy if exists "org_members_can_read_training_modules" on public.training_modules;
drop policy if exists "managers_can_manage_training_modules" on public.training_modules;
drop policy if exists "training_modules_can_read_org_scope" on public.training_modules;
create policy "training_modules_can_read_org_scope" on public.training_modules
for select to authenticated
using (
  org_id = public.current_user_org_id()
  and (
    public.current_user_is_org_wide()
    or public.current_user_role() = 'rep'
    or exists (
      select 1
      from public.team_permission_grants grants
      where grants.org_id = public.current_user_org_id()
        and grants.user_id = auth.uid()
        and grants.permission_key = any(ARRAY['view_team_training', 'manage_team_training']::text[])
    )
  )
);

drop policy if exists "training_modules_admins_can_manage" on public.training_modules;
create policy "training_modules_admins_can_manage" on public.training_modules
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "users_can_read_training_progress" on public.training_progress;
drop policy if exists "users_can_write_training_progress" on public.training_progress;
drop policy if exists "training_progress_can_read_team_scope" on public.training_progress;
create policy "training_progress_can_read_team_scope" on public.training_progress
for select to authenticated
using (
  public.current_user_can_read_rep_with_permissions(
    rep_id,
    ARRAY['view_team_training', 'manage_team_training']::text[]
  )
);

drop policy if exists "training_progress_can_write_team_scope" on public.training_progress;
create policy "training_progress_can_write_team_scope" on public.training_progress
for insert to authenticated
with check (
  public.current_user_can_write_rep_with_permissions(
    rep_id,
    ARRAY['manage_team_training']::text[]
  )
);

drop policy if exists "training_progress_can_update_team_scope" on public.training_progress;
create policy "training_progress_can_update_team_scope" on public.training_progress
for update to authenticated
using (
  public.current_user_can_write_rep_with_permissions(
    rep_id,
    ARRAY['manage_team_training']::text[]
  )
)
with check (
  public.current_user_can_write_rep_with_permissions(
    rep_id,
    ARRAY['manage_team_training']::text[]
  )
);

drop policy if exists "training_progress_can_delete_team_scope" on public.training_progress;
create policy "training_progress_can_delete_team_scope" on public.training_progress
for delete to authenticated
using (
  public.current_user_role() = 'admin'
);

drop policy if exists "org_members_can_read_roleplay_sessions" on public.roleplay_sessions;
drop policy if exists "org_members_can_create_roleplay_sessions" on public.roleplay_sessions;
drop policy if exists "org_members_can_update_roleplay_sessions" on public.roleplay_sessions;
drop policy if exists "roleplay_sessions_can_read_team_scope" on public.roleplay_sessions;
create policy "roleplay_sessions_can_read_team_scope" on public.roleplay_sessions
for select to authenticated
using (
  public.current_user_can_read_rep_with_permissions(
    rep_id,
    ARRAY['view_team_calls']::text[]
  )
);

drop policy if exists "roleplay_sessions_can_write_team_scope" on public.roleplay_sessions;
create policy "roleplay_sessions_can_write_team_scope" on public.roleplay_sessions
for insert to authenticated
with check (
  org_id = public.current_user_org_id()
  and rep_id = auth.uid()
);

drop policy if exists "roleplay_sessions_can_update_team_scope" on public.roleplay_sessions;
create policy "roleplay_sessions_can_update_team_scope" on public.roleplay_sessions
for update to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_can_read_rep_with_permissions(
    rep_id,
    ARRAY['view_team_calls']::text[]
  )
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_can_read_rep_with_permissions(
    rep_id,
    ARRAY['view_team_calls']::text[]
  )
);

drop policy if exists "roleplay_sessions_can_delete_team_scope" on public.roleplay_sessions;
create policy "roleplay_sessions_can_delete_team_scope" on public.roleplay_sessions
for delete to authenticated
using (
  public.current_user_role() = 'admin'
);

drop policy if exists "org_members_can_read_compliance" on public.org_compliance;
drop policy if exists "managers_can_insert_compliance" on public.org_compliance;
drop policy if exists "org_compliance_can_read_admin_scope" on public.org_compliance;
create policy "org_compliance_can_read_admin_scope" on public.org_compliance
for select to authenticated
using (
  org_id = public.current_user_org_id()
);

drop policy if exists "org_compliance_admins_can_manage" on public.org_compliance;
create policy "org_compliance_admins_can_manage" on public.org_compliance
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "org_members_can_read_zoom_integrations" on public.zoom_integrations;
drop policy if exists "managers_can_manage_zoom_integrations" on public.zoom_integrations;
drop policy if exists "zoom_integrations_can_read_admin_scope" on public.zoom_integrations;
create policy "zoom_integrations_can_read_admin_scope" on public.zoom_integrations
for select to authenticated
using (
  org_id = public.current_user_org_id()
);

drop policy if exists "zoom_integrations_admins_can_manage" on public.zoom_integrations;
create policy "zoom_integrations_admins_can_manage" on public.zoom_integrations
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "org_members_can_read_ghl_integrations" on public.ghl_integrations;
drop policy if exists "managers_can_manage_ghl_integrations" on public.ghl_integrations;
drop policy if exists "ghl_integrations_can_read_admin_scope" on public.ghl_integrations;
create policy "ghl_integrations_can_read_admin_scope" on public.ghl_integrations
for select to authenticated
using (
  org_id = public.current_user_org_id()
);

drop policy if exists "ghl_integrations_admins_can_manage" on public.ghl_integrations;
create policy "ghl_integrations_admins_can_manage" on public.ghl_integrations
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);
