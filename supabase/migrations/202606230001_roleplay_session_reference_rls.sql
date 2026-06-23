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
