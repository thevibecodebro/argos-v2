create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id
  from public.users
  where id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_user_org_id() from public;
grant execute on function public.current_user_org_id() to authenticated;

drop policy if exists "users_can_read_their_org" on public.organizations;
create policy "users_can_read_their_org" on public.organizations
for select
to authenticated
using (id = public.current_user_org_id());

drop policy if exists "users_can_read_their_profile" on public.users;
create policy "users_can_read_their_profile" on public.users
for select
to authenticated
using (
  id = auth.uid()
  or org_id = public.current_user_org_id()
);

drop policy if exists "org_members_can_read_calls" on public.calls;
create policy "org_members_can_read_calls" on public.calls
for select
to authenticated
using (org_id = public.current_user_org_id());
