-- Rep visibility helpers answer whether the actor may read a rep, but administrators are
-- organization-wide within their own tenant. Keep the organization predicate at the table
-- policy boundary so that an administrator can never use that helper across tenants.
drop policy if exists "roleplay_sessions_can_read_team_scope" on public.roleplay_sessions;
create policy "roleplay_sessions_can_read_team_scope" on public.roleplay_sessions
for select to authenticated
using (
  org_id = private.current_user_org_id()
  and private.current_user_can_read_rep_with_permissions(
    rep_id,
    ARRAY['view_team_calls']::text[]
  )
);
