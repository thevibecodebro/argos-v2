alter table public.roleplay_sessions
  add column if not exists started_at timestamptz,
  add column if not exists last_activity_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists duration_seconds integer;

update public.roleplay_sessions
set
  started_at = coalesce(started_at, created_at),
  last_activity_at = coalesce(last_activity_at, created_at);
