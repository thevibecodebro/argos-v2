alter table public.audit_events
  drop constraint if exists audit_events_event_type_check;

alter table public.audit_events
  add constraint audit_events_event_type_check
  check (event_type in ('call_exported', 'call_deleted', 'member_removed'));

alter table public.audit_events
  drop constraint if exists audit_events_resource_type_check;

alter table public.audit_events
  add constraint audit_events_resource_type_check
  check (resource_type in ('call', 'user'));
