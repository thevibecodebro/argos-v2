do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ghl_integrations_location_id_unique'
      and conrelid = 'public.ghl_integrations'::regclass
  ) then
    alter table public.ghl_integrations
      add constraint ghl_integrations_location_id_unique unique (location_id);
  end if;
end $$;
