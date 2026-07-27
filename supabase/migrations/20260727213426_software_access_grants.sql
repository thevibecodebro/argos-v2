create table if not exists public.software_access_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null,
  package text not null,
  seat_limit integer not null,
  monthly_voice_minutes_per_seat integer not null default 120,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active',
  contract_reference text not null,
  notes text,
  created_by uuid references public.platform_staff(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint software_access_grants_source_type_check
    check (source_type = 'coaching_contract'),
  constraint software_access_grants_package_check
    check (package in ('solo', 'team')),
  constraint software_access_grants_status_check
    check (status in ('active', 'paused', 'expired', 'revoked')),
  constraint software_access_grants_seat_limit_positive
    check (seat_limit > 0),
  constraint software_access_grants_package_seats_check
    check ((package = 'solo' and seat_limit = 1) or (package = 'team' and seat_limit > 1)),
  constraint software_access_grants_voice_minutes_positive
    check (monthly_voice_minutes_per_seat > 0),
  constraint software_access_grants_dates_check
    check (ends_at > starts_at)
);

create index if not exists software_access_grants_org_status_dates_idx
  on public.software_access_grants (org_id, status, starts_at, ends_at);

create index if not exists software_access_grants_created_by_idx
  on public.software_access_grants (created_by);

create unique index if not exists software_access_grants_one_active_coaching_org_uq
  on public.software_access_grants (org_id)
  where status = 'active';

alter table public.voice_credit_grants
  drop constraint if exists voice_credit_grants_source_type_check;

alter table public.voice_credit_grants
  add constraint voice_credit_grants_source_type_check
  check (source_type in ('subscription_included', 'coaching_included', 'extra_pack'));

alter table public.software_access_grants enable row level security;

revoke all on table public.software_access_grants from anon;
revoke all on table public.software_access_grants from authenticated;
