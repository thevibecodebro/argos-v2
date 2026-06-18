alter table public.call_processing_jobs
  drop constraint if exists call_processing_jobs_source_origin_check;

alter table public.call_processing_jobs
  add constraint call_processing_jobs_source_origin_check
  check (source_origin in ('manual_upload', 'zoom_recording', 'ghl_recording'));

alter table public.ghl_integrations
  add column if not exists sync_enabled boolean not null default false,
  add column if not exists consent_confirmed_at timestamptz,
  add column if not exists consent_confirmed_by uuid references public.users(id) on delete set null,
  add column if not exists default_rep_id uuid references public.users(id) on delete set null,
  add column if not exists last_sync_started_at timestamptz,
  add column if not exists last_sync_completed_at timestamptz,
  add column if not exists last_sync_cursor text,
  add column if not exists last_sync_error text;

create table if not exists public.ghl_user_mappings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  location_id text not null,
  ghl_user_id text not null,
  ghl_user_name text,
  ghl_user_email text,
  argos_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ghl_user_mappings_location_user_unique unique (org_id, location_id, ghl_user_id)
);

create table if not exists public.ghl_call_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  location_id text not null,
  message_id text not null,
  conversation_id text,
  contact_id text,
  ghl_user_id text,
  call_id uuid references public.calls(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'running', 'retrying', 'imported', 'skipped', 'failed')),
  skipped_reason text check (skipped_reason in ('no_connected_integration', 'consent_missing', 'no_recording', 'no_owner_mapping', 'wrong_message_type', 'unauthorized_after_refresh')),
  message_created_at timestamptz,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_run_at timestamptz not null default now(),
  locked_at timestamptz,
  lock_expires_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ghl_call_imports_location_message_unique unique (org_id, location_id, message_id)
);

create index if not exists ghl_call_imports_status_next_run_idx
  on public.ghl_call_imports (status, next_run_at);

create index if not exists ghl_call_imports_lock_expires_idx
  on public.ghl_call_imports (lock_expires_at);

create index if not exists ghl_call_imports_call_id_idx
  on public.ghl_call_imports (call_id);

alter table public.ghl_user_mappings enable row level security;
alter table public.ghl_call_imports enable row level security;
