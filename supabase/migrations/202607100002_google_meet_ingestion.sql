alter table public.call_processing_jobs
  drop constraint if exists call_processing_jobs_source_origin_check;

alter table public.call_processing_jobs
  add constraint call_processing_jobs_source_origin_check
  check (source_origin in ('manual_upload', 'zoom_recording', 'ghl_recording', 'google_meet_recording'));

create table if not exists public.google_meet_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  connected_user_id uuid references public.users(id) on delete set null,
  google_user_id text,
  google_email text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  sync_enabled boolean not null default false,
  consent_confirmed_at timestamptz,
  consent_confirmed_by uuid references public.users(id) on delete set null,
  default_rep_id uuid references public.users(id) on delete set null,
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  last_sync_cursor timestamptz,
  last_sync_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_meet_integrations_google_user_unique unique (google_user_id)
);

create table if not exists public.google_meet_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.google_meet_integrations(id) on delete cascade,
  conference_record_name text not null,
  recording_name text not null,
  drive_file_id text,
  meeting_code text,
  meeting_title text,
  title_source text check (title_source in ('calendar', 'drive')),
  conference_started_at timestamptz,
  conference_ended_at timestamptz,
  call_id uuid references public.calls(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'running', 'retrying', 'imported', 'skipped', 'failed')),
  skipped_reason text check (skipped_reason in (
    'no_connected_integration',
    'sync_disabled',
    'consent_missing',
    'billing_inactive',
    'no_owner',
    'title_filter_unconfigured',
    'title_missing',
    'title_excluded',
    'title_no_include_match',
    'recording_not_ready',
    'unauthorized_after_refresh'
  )),
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_run_at timestamptz not null default now(),
  locked_at timestamptz,
  lock_expires_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_meet_imports_recording_unique unique (org_id, recording_name)
);

create index if not exists google_meet_imports_status_next_run_idx
  on public.google_meet_imports (status, next_run_at);

create index if not exists google_meet_imports_lock_expires_idx
  on public.google_meet_imports (lock_expires_at);

create index if not exists google_meet_imports_call_id_idx
  on public.google_meet_imports (call_id);

alter table public.google_meet_integrations enable row level security;
alter table public.google_meet_imports enable row level security;

revoke all on table public.google_meet_integrations from public;
revoke all on table public.google_meet_integrations from anon;
revoke all on table public.google_meet_integrations from authenticated;

revoke all on table public.google_meet_imports from public;
revoke all on table public.google_meet_imports from anon;
revoke all on table public.google_meet_imports from authenticated;
