alter table public.organizations
  add column if not exists status text not null default 'active',
  add column if not exists archived_at timestamp with time zone,
  add column if not exists archived_by uuid,
  add column if not exists archive_reason text;

alter table public.organizations
  drop constraint if exists organizations_status_check;

alter table public.organizations
  add constraint organizations_status_check
  check (status in ('active', 'archived'));

create index if not exists organizations_status_name_idx
  on public.organizations (status, name);
