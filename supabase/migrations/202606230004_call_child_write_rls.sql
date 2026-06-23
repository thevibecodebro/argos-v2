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
