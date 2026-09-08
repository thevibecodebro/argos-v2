create table if not exists public.manual_recording_upload_targets (
  storage_path text primary key,
  auth_user_id uuid not null references public.users(id) on delete cascade,
  target_org_id uuid not null references public.organizations(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint manual_recording_upload_targets_path_check
    check (storage_path like 'recordings/manual-uploads/%')
);

create index if not exists manual_recording_upload_targets_expires_at_idx
  on public.manual_recording_upload_targets (expires_at);

alter table public.manual_recording_upload_targets enable row level security;

revoke all on table public.manual_recording_upload_targets
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, delete on table public.manual_recording_upload_targets
      to service_role;
  end if;
end
$$;

drop policy if exists "authenticated_users_can_upload_own_manual_recordings"
  on storage.objects;
drop function if exists private.current_user_can_upload_calls();

create or replace function private.current_user_can_upload_calls(storage_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.manual_recording_upload_targets upload_target
    join public.organizations organization
      on organization.id = upload_target.target_org_id
    where upload_target.storage_path = storage_object_name
      and upload_target.auth_user_id = auth.uid()
      and upload_target.expires_at > now()
      and (
        organization.access_model = 'legacy'
        or (
          organization.access_model = 'managed'
          and exists (
            select 1
            from public.software_access_grants access_grant
            join public.software_access_capabilities capability
              on capability.grant_id = access_grant.id
             and capability.org_id = access_grant.org_id
            where access_grant.org_id = organization.id
              and access_grant.access_model = 'managed_capabilities'
              and access_grant.status = 'active'
              and access_grant.starts_at <= now()
              and access_grant.ends_at > now()
              and capability.capability_key = 'call_upload'
          )
        )
      )
  );
$$;

revoke all on function private.current_user_can_upload_calls(text)
  from public, anon, authenticated;
grant execute on function private.current_user_can_upload_calls(text)
  to authenticated;

create policy "authenticated_users_can_upload_own_manual_recordings"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'call-recordings'
  and auth.uid() is not null
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and (select private.current_user_can_upload_calls(name))
  and name like 'recordings/manual-uploads/' || (select auth.uid())::text || '/%'
);
