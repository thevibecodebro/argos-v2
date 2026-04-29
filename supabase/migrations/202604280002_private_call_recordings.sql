alter table if exists public.calls
  add column if not exists recording_storage_bucket text,
  add column if not exists recording_storage_path text,
  add column if not exists recording_content_type text,
  add column if not exists recording_file_size_bytes integer;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage')
    and to_regclass('storage.buckets') is not null then
    execute $sql$
      insert into storage.buckets (id, name, public)
      values ('call-recordings', 'call-recordings', false)
      on conflict (id) do update set public = false
    $sql$;
  end if;
end
$$;
