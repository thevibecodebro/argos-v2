alter table public.call_processing_jobs
  add column if not exists processing_version integer not null default 1,
  add column if not exists generation integer not null default 1,
  add column if not exists failure_count integer not null default 0,
  add column if not exists max_failures integer not null default 3,
  add column if not exists total_chunks integer,
  add column if not exists completed_chunks integer not null default 0,
  add column if not exists lease_token uuid,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_deadline_at timestamptz;

alter table public.call_processing_jobs
  add constraint call_processing_jobs_processing_version_check check (processing_version in (1, 2)),
  add constraint call_processing_jobs_generation_check check (generation >= 1),
  add constraint call_processing_jobs_failure_count_check check (failure_count >= 0),
  add constraint call_processing_jobs_max_failures_check check (max_failures >= 1);

alter table public.call_processing_jobs
  add constraint call_processing_jobs_chunk_progress_check
  check (
    completed_chunks >= 0
    and (total_chunks is null or total_chunks >= 1)
    and (total_chunks is null or completed_chunks <= total_chunks)
  );

create index if not exists call_processing_jobs_v2_due_idx
  on public.call_processing_jobs (next_run_at, created_at)
  where processing_version = 2 and status in ('pending', 'retrying', 'running');

create table if not exists public.call_processing_chunks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.call_processing_jobs(id) on delete cascade,
  manifest_fingerprint text not null,
  chunk_index integer not null check (chunk_index >= 0),
  start_seconds real not null check (start_seconds >= 0),
  end_seconds real not null check (end_seconds > start_seconds),
  audio_hash text,
  status text not null default 'pending' check (status in ('pending', 'running', 'retrying', 'complete', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_run_at timestamptz,
  error_code text,
  error_message text,
  provider_request_id text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  transcript jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_processing_chunks_complete_transcript_check
    check (status <> 'complete' or transcript is not null)
);

create unique index if not exists call_processing_chunks_manifest_index_uq
  on public.call_processing_chunks (job_id, manifest_fingerprint, chunk_index);
create index if not exists call_processing_chunks_job_status_idx
  on public.call_processing_chunks (job_id, status);

create table if not exists public.call_processing_checkpoints (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.call_processing_jobs(id) on delete cascade,
  manifest_fingerprint text not null,
  transcript_hash text,
  duration_seconds real check (duration_seconds is null or duration_seconds > 0),
  merged_transcript jsonb,
  buyer_personality jsonb,
  evaluation jsonb,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists call_processing_checkpoints_job_manifest_uq
  on public.call_processing_checkpoints (job_id, manifest_fingerprint);

alter table public.call_processing_chunks enable row level security;
alter table public.call_processing_checkpoints enable row level security;
revoke all on table public.call_processing_chunks from public, anon, authenticated;
revoke all on table public.call_processing_checkpoints from public, anon, authenticated;
grant select, insert, update, delete on table public.call_processing_chunks to service_role;
grant select, insert, update, delete on table public.call_processing_checkpoints to service_role;

alter table public.notifications add column if not exists dedupe_key text;
create unique index if not exists notifications_dedupe_key_uq
  on public.notifications (dedupe_key) where dedupe_key is not null;
