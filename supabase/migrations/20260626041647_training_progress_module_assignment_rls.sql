create or replace function public.current_user_can_assign_training_progress(
  target_rep_id uuid,
  target_module_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
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
$$;

revoke all on function public.current_user_can_assign_training_progress(uuid, uuid) from public;
grant execute on function public.current_user_can_assign_training_progress(uuid, uuid) to authenticated;

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
  and public.current_user_can_write_rep_with_permissions(
    rep_id,
    ARRAY['manage_team_training']::text[]
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
  and public.current_user_can_write_rep_with_permissions(
    rep_id,
    ARRAY['manage_team_training']::text[]
  )
);

grant insert on table public.training_progress to authenticated;

revoke update on table public.training_progress from public;
revoke update on table public.training_progress from anon;
revoke update on table public.training_progress from authenticated;
grant update (status, score, attempts, completed_at) on table public.training_progress to authenticated;
