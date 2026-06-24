do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'zoom_integrations_account_id_unique'
      and conrelid = 'public.zoom_integrations'::regclass
  ) then
    alter table public.zoom_integrations
      add constraint zoom_integrations_account_id_unique unique (zoom_account_id);
  end if;
end $$;
