alter table public.rubrics enable row level security;
alter table public.rubric_categories enable row level security;
alter table public.call_scores enable row level security;
alter table public.invites enable row level security;
alter table public.call_processing_jobs enable row level security;

drop policy if exists "rubrics_can_read_visible" on public.rubrics;
create policy "rubrics_can_read_visible" on public.rubrics
for select to authenticated
using (
  is_template = true
  or org_id = public.current_user_org_id()
);

drop policy if exists "rubrics_admins_can_manage" on public.rubrics;
create policy "rubrics_admins_can_manage" on public.rubrics
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "rubric_categories_can_read_visible" on public.rubric_categories;
create policy "rubric_categories_can_read_visible" on public.rubric_categories
for select to authenticated
using (
  exists (
    select 1
    from public.rubrics
    where rubrics.id = rubric_categories.rubric_id
      and (
        rubrics.is_template = true
        or rubrics.org_id = public.current_user_org_id()
      )
  )
);

drop policy if exists "rubric_categories_admins_can_manage" on public.rubric_categories;
create policy "rubric_categories_admins_can_manage" on public.rubric_categories
for all to authenticated
using (
  public.current_user_role() = 'admin'
  and exists (
    select 1
    from public.rubrics
    where rubrics.id = rubric_categories.rubric_id
      and rubrics.org_id = public.current_user_org_id()
  )
)
with check (
  public.current_user_role() = 'admin'
  and exists (
    select 1
    from public.rubrics
    where rubrics.id = rubric_categories.rubric_id
      and rubrics.org_id = public.current_user_org_id()
  )
);

drop policy if exists "call_scores_can_read_team_scope" on public.call_scores;
create policy "call_scores_can_read_team_scope" on public.call_scores
for select to authenticated
using (
  public.current_user_can_read_call_with_permissions(call_id, ARRAY['view_team_calls']::text[])
);

revoke all on table public.invites from public;
revoke all on table public.invites from anon;
revoke all on table public.invites from authenticated;
revoke all on table public.call_processing_jobs from public;
revoke all on table public.call_processing_jobs from anon;
revoke all on table public.call_processing_jobs from authenticated;
