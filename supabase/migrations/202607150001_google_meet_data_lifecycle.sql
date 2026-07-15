alter table public.google_meet_imports
  alter column integration_id drop not null,
  alter column conference_record_name drop not null;

alter table public.google_meet_imports
  drop constraint if exists google_meet_imports_integration_id_fkey;

alter table public.google_meet_imports
  add constraint google_meet_imports_integration_id_fkey
  foreign key (integration_id)
  references public.google_meet_integrations(id)
  on delete set null;

alter table public.google_meet_imports
  drop constraint if exists google_meet_imports_status_check;

alter table public.google_meet_imports
  add constraint google_meet_imports_status_check
  check (status in ('pending', 'running', 'retrying', 'imported', 'skipped', 'failed', 'deleted'));

comment on column public.google_meet_imports.recording_name is
  'Opaque Google recording resource retained after deletion only to suppress re-import.';
