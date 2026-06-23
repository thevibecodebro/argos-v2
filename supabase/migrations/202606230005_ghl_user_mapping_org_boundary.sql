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
