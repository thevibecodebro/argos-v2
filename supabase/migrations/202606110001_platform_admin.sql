create table if not exists public.platform_staff (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_by uuid references public.users(id) on delete set null,
  revoked_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.platform_access_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid references public.platform_staff(user_id) on delete set null,
  target_org_id uuid references public.organizations(id) on delete set null,
  staff_email_snapshot text,
  staff_role_snapshot text,
  target_org_name_snapshot text,
  target_org_slug_snapshot text,
  reason text not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz
);

create table if not exists public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid references public.platform_staff(user_id) on delete set null,
  target_org_id uuid references public.organizations(id) on delete set null,
  session_id uuid references public.platform_access_sessions(id) on delete set null,
  staff_email_snapshot text,
  staff_role_snapshot text,
  target_org_name_snapshot text,
  target_org_slug_snapshot text,
  action text not null,
  resource_type text not null,
  resource_id text,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.platform_access_sessions
  alter column staff_user_id drop not null,
  alter column target_org_id drop not null;

alter table public.platform_access_sessions
  add column if not exists staff_email_snapshot text,
  add column if not exists staff_role_snapshot text,
  add column if not exists target_org_name_snapshot text,
  add column if not exists target_org_slug_snapshot text;

alter table public.platform_audit_events
  add column if not exists staff_email_snapshot text,
  add column if not exists staff_role_snapshot text,
  add column if not exists target_org_name_snapshot text,
  add column if not exists target_org_slug_snapshot text;

do $$
begin
  alter table public.platform_access_sessions
    drop constraint if exists platform_access_sessions_staff_user_id_fkey;
  alter table public.platform_access_sessions
    drop constraint if exists platform_access_sessions_target_org_id_fkey;
  alter table public.platform_audit_events
    drop constraint if exists platform_audit_events_staff_user_id_fkey;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_access_sessions_staff_user_id_fkey'
      and conrelid = 'public.platform_access_sessions'::regclass
  ) then
    alter table public.platform_access_sessions
      add constraint platform_access_sessions_staff_user_id_fkey
      foreign key (staff_user_id)
      references public.platform_staff(user_id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_access_sessions_target_org_id_fkey'
      and conrelid = 'public.platform_access_sessions'::regclass
  ) then
    alter table public.platform_access_sessions
      add constraint platform_access_sessions_target_org_id_fkey
      foreign key (target_org_id)
      references public.organizations(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_audit_events_staff_user_id_fkey'
      and conrelid = 'public.platform_audit_events'::regclass
  ) then
    alter table public.platform_audit_events
      add constraint platform_audit_events_staff_user_id_fkey
      foreign key (staff_user_id)
      references public.platform_staff(user_id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_staff_role_check'
      and conrelid = 'public.platform_staff'::regclass
  ) then
    alter table public.platform_staff
      add constraint platform_staff_role_check
      check (role in ('owner', 'operator'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_staff_status_check'
      and conrelid = 'public.platform_staff'::regclass
  ) then
    alter table public.platform_staff
      add constraint platform_staff_status_check
      check (status in ('active', 'revoked'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_access_sessions_status_check'
      and conrelid = 'public.platform_access_sessions'::regclass
  ) then
    alter table public.platform_access_sessions
      add constraint platform_access_sessions_status_check
      check (status in ('active', 'ended', 'expired'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_access_sessions_expires_after_started_check'
      and conrelid = 'public.platform_access_sessions'::regclass
  ) then
    alter table public.platform_access_sessions
      add constraint platform_access_sessions_expires_after_started_check
      check (expires_at > started_at);
  end if;
end $$;

create index if not exists platform_staff_status_role_idx
  on public.platform_staff (status, role);
create index if not exists platform_staff_created_by_idx
  on public.platform_staff (created_by);
create index if not exists platform_staff_revoked_by_idx
  on public.platform_staff (revoked_by);

create index if not exists platform_access_sessions_staff_status_expires_idx
  on public.platform_access_sessions (staff_user_id, status, expires_at);
create index if not exists platform_access_sessions_target_org_idx
  on public.platform_access_sessions (target_org_id);
create index if not exists platform_access_sessions_active_lookup_idx
  on public.platform_access_sessions (id, staff_user_id, expires_at)
  where status = 'active';

create index if not exists platform_audit_events_target_org_created_at_idx
  on public.platform_audit_events (target_org_id, created_at);
create index if not exists platform_audit_events_staff_created_at_idx
  on public.platform_audit_events (staff_user_id, created_at);
create index if not exists platform_audit_events_session_id_idx
  on public.platform_audit_events (session_id);
create index if not exists platform_audit_events_resource_idx
  on public.platform_audit_events (resource_type, resource_id);

alter table public.platform_staff enable row level security;
alter table public.platform_access_sessions enable row level security;
alter table public.platform_audit_events enable row level security;

revoke all on table public.platform_staff from public;
revoke all on table public.platform_staff from anon;
revoke all on table public.platform_staff from authenticated;
revoke all on table public.platform_access_sessions from public;
revoke all on table public.platform_access_sessions from anon;
revoke all on table public.platform_access_sessions from authenticated;
revoke all on table public.platform_audit_events from public;
revoke all on table public.platform_audit_events from anon;
revoke all on table public.platform_audit_events from authenticated;
