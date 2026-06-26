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
