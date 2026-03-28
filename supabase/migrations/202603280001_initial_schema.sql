create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'trial',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key,
  org_id uuid references public.organizations(id),
  role text check (role in ('rep', 'manager', 'executive', 'admin')),
  email text not null unique,
  first_name text,
  last_name text,
  profile_image_url text,
  display_name_set boolean not null default false,
  legacy_replit_user_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references public.users(id) on delete cascade,
  recording_url text,
  transcript_url text,
  duration_seconds integer,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'transcribing', 'evaluating', 'complete', 'failed')),
  consent_confirmed boolean not null default false,
  overall_score integer,
  call_topic text,
  crm_deal_id text,
  zoom_recording_id text unique,
  zoom_meeting_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_org_id on public.users (org_id);
create index if not exists idx_calls_rep_created_at on public.calls (rep_id, created_at desc);
create index if not exists idx_calls_org_status_created_at on public.calls (org_id, status, created_at desc);

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.calls enable row level security;

create policy "users_can_read_their_org" on public.organizations
for select
to authenticated
using (
  id in (
    select org_id
    from public.users
    where id = auth.uid()
  )
);

create policy "users_can_read_their_profile" on public.users
for select
to authenticated
using (
  id = auth.uid()
  or org_id in (
    select org_id
    from public.users
    where id = auth.uid()
  )
);

create policy "org_members_can_read_calls" on public.calls
for select
to authenticated
using (
  org_id in (
    select org_id
    from public.users
    where id = auth.uid()
  )
);
