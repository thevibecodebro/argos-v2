alter table public.zoom_integrations
  add column if not exists connected_user_id uuid references public.users(id) on delete cascade;

alter table public.zoom_integrations
  drop constraint if exists zoom_integrations_org_id_unique;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'zoom_integrations_org_connected_user_unique'
      and conrelid = 'public.zoom_integrations'::regclass
  ) then
    alter table public.zoom_integrations
      add constraint zoom_integrations_org_connected_user_unique
      unique (org_id, connected_user_id);
  end if;
end $$;

drop policy if exists "org_members_can_read_zoom_integrations" on public.zoom_integrations;
drop policy if exists "zoom_integrations_can_read_admin_scope" on public.zoom_integrations;
create policy "zoom_integrations_can_read_admin_scope" on public.zoom_integrations
for select to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "org_members_can_read_ghl_integrations" on public.ghl_integrations;
drop policy if exists "ghl_integrations_can_read_admin_scope" on public.ghl_integrations;
create policy "ghl_integrations_can_read_admin_scope" on public.ghl_integrations
for select to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);
