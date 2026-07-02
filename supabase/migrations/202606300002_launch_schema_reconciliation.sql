-- Public launch reconciliation for schema that was verified against production
-- before repairing migration history. Keep this migration idempotent because it
-- is applied explicitly to the linked production project before history repair.

alter table public.organizations
  add column if not exists workspace_theme jsonb;

do $$
begin
  if to_regclass('public.platform_staff') is null then
    raise exception 'expected public.platform_staff to exist before launch reconciliation';
  end if;

  if to_regclass('public.platform_access_sessions') is null then
    raise exception 'expected public.platform_access_sessions to exist before launch reconciliation';
  end if;

  if to_regclass('public.platform_audit_events') is null then
    raise exception 'expected public.platform_audit_events to exist before launch reconciliation';
  end if;

  if to_regclass('public.training_progress') is null then
    raise exception 'expected public.training_progress to exist before launch reconciliation';
  end if;
end $$;

delete from public.ghl_user_mappings mappings
where not exists (
  select 1
  from public.users
  where users.id = mappings.argos_user_id
    and users.org_id = mappings.org_id
);

alter table public.ghl_user_mappings
  drop constraint if exists ghl_user_mappings_argos_user_org_id_users_id_org_id_fkey;

alter table public.ghl_user_mappings
  add constraint ghl_user_mappings_argos_user_org_id_users_id_org_id_fkey
  foreign key (argos_user_id, org_id)
  references public.users(id, org_id)
  on delete cascade;

create or replace function public.current_user_can_assign_training_progress(
  target_rep_id uuid,
  target_module_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return
    public.user_belongs_to_current_org(target_rep_id)
    and exists (
      select 1
      from public.training_modules modules
      where modules.id = target_module_id
        and modules.org_id = public.current_user_org_id()
    )
    and (
      public.current_user_role() = 'admin'
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
            and grants.permission_key = 'manage_team_training'
        )
      )
    );
end;
$$;

create or replace function public.current_user_can_update_training_progress(
  target_rep_id uuid,
  target_module_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return
    public.user_belongs_to_current_org(target_rep_id)
    and exists (
      select 1
      from public.training_modules modules
      where modules.id = target_module_id
        and modules.org_id = public.current_user_org_id()
    )
    and (
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
            and grants.permission_key = 'manage_team_training'
        )
      )
    );
end;
$$;

create or replace function public.current_user_can_read_training_progress(
  target_rep_id uuid,
  target_module_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return
    public.user_belongs_to_current_org(target_rep_id)
    and exists (
      select 1
      from public.training_modules modules
      where modules.id = target_module_id
        and modules.org_id = public.current_user_org_id()
    )
    and (
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
            and grants.permission_key in ('view_team_training', 'manage_team_training')
        )
      )
    );
end;
$$;

revoke all on function public.current_user_can_assign_training_progress(uuid, uuid) from public;
grant execute on function public.current_user_can_assign_training_progress(uuid, uuid) to authenticated;

revoke all on function public.current_user_can_update_training_progress(uuid, uuid) from public;
grant execute on function public.current_user_can_update_training_progress(uuid, uuid) to authenticated;

revoke all on function public.current_user_can_read_training_progress(uuid, uuid) from public;
grant execute on function public.current_user_can_read_training_progress(uuid, uuid) to authenticated;

grant select on table public.team_memberships to authenticated;
grant select on table public.team_permission_grants to authenticated;

drop policy if exists "training_progress_can_read_team_scope" on public.training_progress;
create policy "training_progress_can_read_team_scope" on public.training_progress
for select to authenticated
using (
  public.current_user_can_read_training_progress(
    rep_id,
    module_id
  )
);

drop policy if exists "training_progress_can_write_team_scope" on public.training_progress;
create policy "training_progress_can_write_team_scope" on public.training_progress
for insert to authenticated
with check (
  status = 'assigned'
  and public.current_user_can_assign_training_progress(
    rep_id,
    module_id
  )
);

drop policy if exists "training_progress_can_update_team_scope" on public.training_progress;
create policy "training_progress_can_update_team_scope" on public.training_progress
for update to authenticated
using (
  public.user_belongs_to_current_org(rep_id)
  and exists (
    select 1
    from public.training_modules modules
    where modules.id = training_progress.module_id
      and modules.org_id = public.current_user_org_id()
  )
  and public.current_user_can_update_training_progress(
    rep_id,
    module_id
  )
)
with check (
  public.user_belongs_to_current_org(rep_id)
  and exists (
    select 1
    from public.training_modules modules
    where modules.id = training_progress.module_id
      and modules.org_id = public.current_user_org_id()
  )
  and public.current_user_can_update_training_progress(
    rep_id,
    module_id
  )
);

grant insert on table public.training_progress to authenticated;

revoke update on table public.training_progress from public;
revoke update on table public.training_progress from anon;
revoke update on table public.training_progress from authenticated;
grant update (status, score, attempts, completed_at) on table public.training_progress to authenticated;

drop policy if exists "roleplay_sessions_can_write_team_scope" on public.roleplay_sessions;
create policy "roleplay_sessions_can_write_team_scope" on public.roleplay_sessions
for insert to authenticated
with check (
  org_id = public.current_user_org_id()
  and rep_id = auth.uid()
  and (
    source_call_id is null
    or exists (
      select 1
      from public.calls
      where calls.id = roleplay_sessions.source_call_id
        and calls.org_id = public.current_user_org_id()
    )
  )
  and (
    rubric_id is null
    or exists (
      select 1
      from public.rubrics
      where rubrics.id = roleplay_sessions.rubric_id
        and rubrics.org_id = public.current_user_org_id()
    )
  )
);

drop policy if exists "roleplay_sessions_can_update_team_scope" on public.roleplay_sessions;
create policy "roleplay_sessions_can_update_team_scope" on public.roleplay_sessions
for update to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_can_write_rep_with_permissions(
    rep_id,
    ARRAY['coach_team_calls']::text[]
  )
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_can_write_rep_with_permissions(
    rep_id,
    ARRAY['coach_team_calls']::text[]
  )
);

drop policy if exists "org_members_can_read_calls" on public.calls;
drop policy if exists "calls_can_read_team_scope" on public.calls;
create policy "calls_can_read_team_scope" on public.calls
for select to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_can_read_rep_with_permissions(
    rep_id,
    ARRAY['view_team_calls']::text[]
  )
);

drop policy if exists "call_moments_can_write_team_scope" on public.call_moments;
create policy "call_moments_can_write_team_scope" on public.call_moments
for insert to authenticated
with check (
  public.current_user_can_write_call_with_permissions(call_id, ARRAY['manage_call_highlights']::text[])
);

drop policy if exists "call_moments_can_update_team_scope" on public.call_moments;
create policy "call_moments_can_update_team_scope" on public.call_moments
for update to authenticated
using (
  public.current_user_can_write_call_with_permissions(call_id, ARRAY['manage_call_highlights']::text[])
)
with check (
  public.current_user_can_write_call_with_permissions(call_id, ARRAY['manage_call_highlights']::text[])
);

drop policy if exists "call_moments_can_delete_team_scope" on public.call_moments;
create policy "call_moments_can_delete_team_scope" on public.call_moments
for delete to authenticated
using (
  public.current_user_can_write_call_with_permissions(call_id, ARRAY['manage_call_highlights']::text[])
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
  (
    author_id = auth.uid()
    and exists (
      select 1
      from public.calls
      where calls.id = call_annotations.call_id
        and calls.org_id = public.current_user_org_id()
    )
  )
  or public.current_user_can_write_call_with_permissions(call_id, ARRAY['coach_team_calls']::text[])
)
with check (
  (
    author_id = auth.uid()
    and exists (
      select 1
      from public.calls
      where calls.id = call_annotations.call_id
        and calls.org_id = public.current_user_org_id()
    )
  )
  or public.current_user_can_write_call_with_permissions(call_id, ARRAY['coach_team_calls']::text[])
);

drop policy if exists "call_annotations_can_delete_team_scope" on public.call_annotations;
create policy "call_annotations_can_delete_team_scope" on public.call_annotations
for delete to authenticated
using (
  (
    author_id = auth.uid()
    and exists (
      select 1
      from public.calls
      where calls.id = call_annotations.call_id
        and calls.org_id = public.current_user_org_id()
    )
  )
  or public.current_user_can_write_call_with_permissions(call_id, ARRAY['coach_team_calls']::text[])
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ghl_integrations_location_id_unique'
      and conrelid = 'public.ghl_integrations'::regclass
  ) then
    alter table public.ghl_integrations
      add constraint ghl_integrations_location_id_unique unique (location_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'zoom_integrations_account_id_unique'
      and conrelid = 'public.zoom_integrations'::regclass
  ) then
    alter table public.zoom_integrations
      add constraint zoom_integrations_account_id_unique unique (zoom_account_id);
  end if;
end $$;

alter table public.ghl_call_imports
  drop constraint if exists ghl_call_imports_skipped_reason_check;

alter table public.ghl_call_imports
  add constraint ghl_call_imports_skipped_reason_check
  check (
    skipped_reason in (
      'billing_inactive',
      'no_connected_integration',
      'consent_missing',
      'no_recording',
      'no_owner_mapping',
      'wrong_message_type',
      'invalid_recording_filename',
      'unauthorized_after_refresh'
    )
  );
