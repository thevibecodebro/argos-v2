create table if not exists public.organization_ingestion_title_filters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('include', 'exclude')),
  phrase text not null,
  normalized_phrase text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_ingestion_title_filters_org_kind_normalized_unique
    unique (org_id, kind, normalized_phrase)
);

alter table public.organization_ingestion_title_filters enable row level security;

revoke all on table public.organization_ingestion_title_filters from public;
revoke all on table public.organization_ingestion_title_filters from anon;
revoke all on table public.organization_ingestion_title_filters from authenticated;

alter table public.audit_events
  drop constraint if exists audit_events_event_type_check;

alter table public.audit_events
  add constraint audit_events_event_type_check
  check (event_type in (
    'call_exported',
    'call_deleted',
    'ingestion_title_filters_updated'
  ));

alter table public.audit_events
  drop constraint if exists audit_events_resource_type_check;

alter table public.audit_events
  add constraint audit_events_resource_type_check
  check (resource_type in ('call', 'organization'));
