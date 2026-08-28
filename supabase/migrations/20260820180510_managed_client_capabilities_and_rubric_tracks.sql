alter table public.organizations
  add column if not exists access_model text not null default 'legacy';

alter table public.organizations
  drop constraint if exists organizations_access_model_check;

alter table public.organizations
  add constraint organizations_access_model_check
  check (access_model in ('legacy', 'managed'));

alter table public.ghl_call_imports
  drop constraint if exists ghl_call_imports_skipped_reason_check;

alter table public.ghl_call_imports
  add constraint ghl_call_imports_skipped_reason_check
  check (skipped_reason in (
    'billing_inactive',
    'no_connected_integration',
    'consent_missing',
    'no_recording',
    'no_owner_mapping',
    'wrong_message_type',
    'invalid_recording_filename',
    'capability_disabled',
    'unauthorized_after_refresh'
  ));

alter table public.google_meet_imports
  drop constraint if exists google_meet_imports_skipped_reason_check;

alter table public.google_meet_imports
  add constraint google_meet_imports_skipped_reason_check
  check (skipped_reason in (
    'no_connected_integration',
    'sync_disabled',
    'consent_missing',
    'billing_inactive',
    'no_owner',
    'title_filter_unconfigured',
    'title_missing',
    'title_excluded',
    'title_no_include_match',
    'recording_not_ready',
    'capability_disabled',
    'unauthorized_after_refresh'
  ));

alter table public.software_access_grants
  add column if not exists access_model text not null default 'legacy_package',
  add column if not exists version integer not null default 1;

alter table public.software_access_grants
  drop constraint if exists software_access_grants_access_model_check;

alter table public.software_access_grants
  add constraint software_access_grants_access_model_check
  check (access_model in ('legacy_package', 'managed_capabilities'));

alter table public.software_access_grants
  drop constraint if exists software_access_grants_version_positive;

alter table public.software_access_grants
  add constraint software_access_grants_version_positive
  check (version > 0);

alter table public.software_access_grants
  drop constraint if exists software_access_grants_id_org_id_uq;

alter table public.software_access_grants
  add constraint software_access_grants_id_org_id_uq unique (id, org_id);

create table if not exists public.software_access_capabilities (
  grant_id uuid not null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  capability_key text not null,
  created_at timestamptz not null default now(),
  primary key (grant_id, capability_key),
  constraint software_access_capabilities_grant_org_fkey
    foreign key (grant_id, org_id)
    references public.software_access_grants(id, org_id)
    on delete cascade,
  constraint software_access_capabilities_key_check
    check (
      capability_key in (
        'training',
        'roleplay',
        'roleplay_voice',
        'custom_scenarios',
        'team_rubrics',
        'practice_reporting',
        'call_upload',
        'call_ingestion',
        'call_scoring',
        'highlights',
        'call_analytics',
        'leaderboard',
        'integration_google_meet',
        'integration_ghl',
        'integration_zoom',
        'workspace_branding'
      )
    )
);

create index if not exists software_access_capabilities_org_grant_idx
  on public.software_access_capabilities (org_id, grant_id);

alter table public.software_access_capabilities enable row level security;

revoke all on table public.software_access_capabilities from public;
revoke all on table public.software_access_capabilities from anon;
revoke all on table public.software_access_capabilities from authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on table public.software_access_capabilities to service_role;
  end if;
end
$$;

create table if not exists public.rubric_tracks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, org_id),
  constraint rubric_tracks_name_not_blank_check check (btrim(name) <> '')
);

create unique index if not exists rubric_tracks_org_name_uq
  on public.rubric_tracks (org_id, lower(name));

create unique index if not exists rubric_tracks_one_default_org_uq
  on public.rubric_tracks (org_id)
  where is_default = true;

insert into public.rubric_tracks (org_id, name, is_default)
select distinct rubrics.org_id, 'Default', true
from public.rubrics
where rubrics.org_id is not null
on conflict do nothing;

alter table public.rubrics
  add column if not exists track_id uuid;

update public.rubrics
set track_id = rubric_tracks.id
from public.rubric_tracks
where public.rubrics.org_id = rubric_tracks.org_id
  and rubric_tracks.is_default = true
  and public.rubrics.track_id is null;

alter table public.rubrics
  drop constraint if exists rubrics_track_org_fkey;

alter table public.rubrics
  add constraint rubrics_track_org_fkey
  foreign key (track_id, org_id)
  references public.rubric_tracks(id, org_id)
  on delete restrict;

drop index if exists public.rubrics_org_version_uq;

create unique index if not exists rubrics_track_version_uq
  on public.rubrics (track_id, version)
  where track_id is not null;

do $$
begin
  if exists (
    select 1
    from public.rubrics
    where is_active = true
      and track_id is not null
    group by track_id
    having count(*) > 1
  ) then
    raise exception 'Cannot add rubric track current-version constraint: a track has multiple active rubrics';
  end if;
end
$$;

create unique index if not exists rubrics_one_active_track_uq
  on public.rubrics (track_id)
  where is_active = true and track_id is not null;

create table if not exists public.team_rubric_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null,
  track_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_rubric_assignments_team_uq unique (team_id),
  constraint team_rubric_assignments_team_org_fkey
    foreign key (team_id, org_id)
    references public.teams(id, org_id)
    on delete cascade,
  constraint team_rubric_assignments_track_org_fkey
    foreign key (track_id, org_id)
    references public.rubric_tracks(id, org_id)
    on delete cascade
);

create index if not exists team_rubric_assignments_org_track_idx
  on public.team_rubric_assignments (org_id, track_id);

alter table public.rubric_tracks enable row level security;
alter table public.team_rubric_assignments enable row level security;

drop policy if exists "rubric_tracks_can_read_org_scope" on public.rubric_tracks;
create policy "rubric_tracks_can_read_org_scope" on public.rubric_tracks
for select to authenticated
using (org_id = private.current_user_org_id());

drop policy if exists "rubric_tracks_admins_can_manage" on public.rubric_tracks;
create policy "rubric_tracks_admins_can_manage" on public.rubric_tracks
for all to authenticated
using (
  org_id = private.current_user_org_id()
  and private.current_user_role() = 'admin'
)
with check (
  org_id = private.current_user_org_id()
  and private.current_user_role() = 'admin'
);

drop policy if exists "team_rubric_assignments_can_read_org_scope" on public.team_rubric_assignments;
create policy "team_rubric_assignments_can_read_org_scope" on public.team_rubric_assignments
for select to authenticated
using (org_id = private.current_user_org_id());

drop policy if exists "team_rubric_assignments_admins_can_manage" on public.team_rubric_assignments;
create policy "team_rubric_assignments_admins_can_manage" on public.team_rubric_assignments
for all to authenticated
using (
  org_id = private.current_user_org_id()
  and private.current_user_role() = 'admin'
)
with check (
  org_id = private.current_user_org_id()
  and private.current_user_role() = 'admin'
);

revoke all on table public.rubric_tracks from public;
revoke all on table public.rubric_tracks from anon;
revoke all on table public.rubric_tracks from authenticated;
revoke all on table public.team_rubric_assignments from public;
revoke all on table public.team_rubric_assignments from anon;
revoke all on table public.team_rubric_assignments from authenticated;

-- Rubric configuration is a server-side capability boundary. Tenant JWTs may
-- retain read access through existing policies, but cannot mutate tracks by
-- calling the Supabase data API directly.
revoke insert, update, delete on table public.rubrics from public;
revoke insert, update, delete on table public.rubrics from anon;
revoke insert, update, delete on table public.rubrics from authenticated;
revoke insert, update, delete on table public.rubric_categories from public;
revoke insert, update, delete on table public.rubric_categories from anon;
revoke insert, update, delete on table public.rubric_categories from authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on table public.rubric_tracks to service_role;
    grant select, insert, update, delete on table public.team_rubric_assignments to service_role;
    grant select, insert, update, delete on table public.rubrics to service_role;
    grant select, insert, update, delete on table public.rubric_categories to service_role;
  end if;
end;
$$;
