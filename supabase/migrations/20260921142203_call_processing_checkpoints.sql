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

create or replace function public.create_or_reset_call_processing_job(
  target_call_id uuid,
  target_processing_version integer,
  target_rubric_id uuid,
  target_source_content_type text,
  target_source_file_name text,
  target_source_origin text,
  target_source_size_bytes integer,
  target_source_storage_path text
)
returns setof public.call_processing_jobs
language sql
security definer
set search_path = public
as $$
  insert into public.call_processing_jobs (
    call_id, rubric_id, source_origin, source_storage_path, source_file_name,
    source_content_type, source_size_bytes, status, processing_version
  ) values (
    target_call_id, target_rubric_id, target_source_origin, target_source_storage_path,
    target_source_file_name, target_source_content_type, target_source_size_bytes,
    'pending', target_processing_version
  )
  on conflict (call_id) do update set
    rubric_id = excluded.rubric_id,
    source_origin = excluded.source_origin,
    source_storage_path = excluded.source_storage_path,
    source_file_name = excluded.source_file_name,
    source_content_type = excluded.source_content_type,
    source_size_bytes = excluded.source_size_bytes,
    status = 'pending',
    processing_version = excluded.processing_version,
    generation = public.call_processing_jobs.generation + 1,
    attempt_count = 0,
    failure_count = 0,
    completed_chunks = 0,
    total_chunks = null,
    next_run_at = now(),
    locked_at = null,
    lock_expires_at = null,
    lease_token = null,
    heartbeat_at = null,
    processing_started_at = null,
    processing_deadline_at = null,
    last_stage = null,
    last_error = null,
    updated_at = now()
  returning *;
$$;

revoke all on function public.create_or_reset_call_processing_job(uuid, integer, uuid, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.create_or_reset_call_processing_job(uuid, integer, uuid, text, text, text, integer, text)
  to service_role;

create or replace function public.retry_call_processing_job(
  target_call_id uuid,
  target_processing_version integer
)
returns setof public.call_processing_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.calls
  set status = 'uploaded'
  where id = target_call_id
    and exists (
      select 1 from public.call_processing_jobs
      where call_id = target_call_id
        and status = 'failed'
        and (target_processing_version = 2 or processing_version = 2 or attempt_count < max_attempts)
    );

  return query
  update public.call_processing_jobs
  set status = 'pending',
    processing_version = greatest(processing_version, target_processing_version),
    generation = case
      when greatest(processing_version, target_processing_version) = 2 then generation + 1
      else generation
    end,
    attempt_count = case when target_processing_version = 2 then 0 else attempt_count end,
    failure_count = 0,
    completed_chunks = 0,
    total_chunks = null,
    next_run_at = now(),
    locked_at = null,
    lock_expires_at = null,
    lease_token = null,
    heartbeat_at = null,
    processing_started_at = null,
    processing_deadline_at = null,
    last_stage = null,
    last_error = null,
    updated_at = now()
  where call_id = target_call_id
    and status = 'failed'
    and (target_processing_version = 2 or processing_version = 2 or attempt_count < max_attempts)
  returning *;
end;
$$;

revoke all on function public.retry_call_processing_job(uuid, integer) from public, anon, authenticated;
grant execute on function public.retry_call_processing_job(uuid, integer) to service_role;

alter table public.notifications add column if not exists dedupe_key text;
create unique index if not exists notifications_dedupe_key_uq
  on public.notifications (dedupe_key) where dedupe_key is not null;
