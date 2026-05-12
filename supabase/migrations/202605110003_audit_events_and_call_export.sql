create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_event_type_check check (event_type in ('call_exported', 'call_deleted')),
  constraint audit_events_resource_type_check check (resource_type in ('call'))
);

create index if not exists audit_events_org_created_at_idx
  on public.audit_events (org_id, created_at);
create index if not exists audit_events_actor_created_at_idx
  on public.audit_events (actor_id, created_at);
create index if not exists audit_events_resource_idx
  on public.audit_events (resource_type, resource_id);

alter table public.audit_events enable row level security;

revoke all on table public.audit_events from anon;
revoke all on table public.audit_events from authenticated;

