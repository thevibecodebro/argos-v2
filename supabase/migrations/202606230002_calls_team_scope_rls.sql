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
