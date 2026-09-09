-- Deployment prerequisite for segment-based roleplay voice accounting.
-- No legacy elapsed time is backfilled: historical pauses cannot be reconstructed.
create table public.roleplay_voice_segments (
  session_id uuid not null references public.roleplay_sessions(id) on delete cascade,
  id uuid not null,
  started_at timestamptz,
  stopped_at timestamptz,
  lease_expires_at timestamptz,
  primary key (session_id, id)
);
alter table public.roleplay_voice_segments enable row level security;
revoke all on public.roleplay_voice_segments from anon, authenticated;
grant all on public.roleplay_voice_segments to service_role;

-- Use database execution time, not a timestamp captured before a delayed request.
create function public.renew_roleplay_voice_segment(p_session_id uuid, p_id uuid)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  update public.roleplay_voice_segments
  set lease_expires_at = clock_timestamp() + interval '30 seconds'
  where session_id = p_session_id and id = p_id
    and stopped_at is null and lease_expires_at > clock_timestamp();
$$;
revoke all on function public.renew_roleplay_voice_segment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.renew_roleplay_voice_segment(uuid, uuid) to service_role;
