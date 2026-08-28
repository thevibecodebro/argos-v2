alter table public.calls
  add column if not exists buyer_profile_status text,
  add column if not exists buyer_personality_profile jsonb,
  add column if not exists buyer_personality_schema_version integer,
  add column if not exists buyer_personality_model text,
  add column if not exists buyer_personality_generated_at timestamptz;

alter table public.calls drop constraint if exists calls_buyer_profile_status_check;
alter table public.calls add constraint calls_buyer_profile_status_check
  check (buyer_profile_status is null or buyer_profile_status in ('pending', 'processing', 'ready', 'needs_review', 'failed'));

alter table public.roleplay_sessions
  add column if not exists buyer_personality_snapshot jsonb;

alter table public.call_processing_jobs drop constraint if exists call_processing_jobs_last_stage_check;
alter table public.call_processing_jobs add constraint call_processing_jobs_last_stage_check
  check (last_stage in ('download', 'normalize', 'chunk', 'transcribe', 'profile', 'score', 'persist'));

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('call_scored', 'recording_ready', 'annotation_added', 'module_assigned'));
