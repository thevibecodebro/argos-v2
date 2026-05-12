alter table public.roleplay_sessions
  add column if not exists voice_started_at timestamptz,
  add column if not exists voice_completed_at timestamptz,
  add column if not exists voice_minutes_settled integer not null default 0,
  add column if not exists voice_settled_at timestamptz;

