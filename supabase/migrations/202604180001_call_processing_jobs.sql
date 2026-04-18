create table if not exists public.call_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade unique,
  source_origin text not null check (source_origin in ('manual_upload', 'zoom_recording')),
  source_storage_path text not null,
  source_file_name text not null,
  source_content_type text,
  source_size_bytes integer,
  status text not null default 'pending' check (status in ('pending', 'running', 'retrying', 'failed', 'complete')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_run_at timestamptz not null default now(),
  locked_at timestamptz,
  lock_expires_at timestamptz,
  last_stage text check (last_stage in ('download', 'normalize', 'chunk', 'transcribe', 'score', 'persist')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists call_processing_jobs_status_next_run_idx
  on public.call_processing_jobs (status, next_run_at);

create index if not exists call_processing_jobs_lock_expires_idx
  on public.call_processing_jobs (lock_expires_at);
