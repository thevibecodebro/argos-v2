create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  drop constraint if exists users_id_org_id_unique,
  add constraint users_id_org_id_unique unique (id, org_id);

alter table public.teams
  drop constraint if exists teams_id_org_id_unique,
  add constraint teams_id_org_id_unique unique (id, org_id);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null,
  user_id uuid not null,
  membership_type text not null check (membership_type in ('rep', 'manager')),
  created_at timestamptz not null default now()
);

alter table public.team_memberships
  drop constraint if exists team_memberships_team_id_fkey,
  drop constraint if exists team_memberships_user_id_fkey,
  drop constraint if exists team_memberships_team_org_id_teams_id_org_id_fkey,
  drop constraint if exists team_memberships_user_org_id_users_id_org_id_fkey,
  add constraint team_memberships_team_org_id_teams_id_org_id_fkey
    foreign key (team_id, org_id) references public.teams(id, org_id) on delete cascade,
  add constraint team_memberships_user_org_id_users_id_org_id_fkey
    foreign key (user_id, org_id) references public.users(id, org_id) on delete cascade;

create unique index if not exists team_memberships_unique_user_team_type
  on public.team_memberships (team_id, user_id, membership_type);

create table if not exists public.rep_manager_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null,
  manager_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.rep_manager_assignments
  drop constraint if exists rep_manager_assignments_rep_id_fkey,
  drop constraint if exists rep_manager_assignments_manager_id_fkey,
  drop constraint if exists rep_manager_assignments_rep_org_id_users_id_org_id_fkey,
  drop constraint if exists rep_manager_assignments_manager_org_id_users_id_org_id_fkey,
  add constraint rep_manager_assignments_rep_org_id_users_id_org_id_fkey
    foreign key (rep_id, org_id) references public.users(id, org_id) on delete cascade,
  add constraint rep_manager_assignments_manager_org_id_users_id_org_id_fkey
    foreign key (manager_id, org_id) references public.users(id, org_id) on delete cascade;

create unique index if not exists rep_manager_assignments_unique_rep
  on public.rep_manager_assignments (rep_id);

create table if not exists public.team_permission_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null,
  user_id uuid not null,
  permission_key text not null check (permission_key in (
    'view_team_calls',
    'coach_team_calls',
    'manage_call_highlights',
    'view_team_training',
    'manage_team_training',
    'manage_team_roster',
    'view_team_analytics'
  )),
  granted_by uuid not null,
  created_at timestamptz not null default now()
);

alter table public.team_permission_grants
  drop constraint if exists team_permission_grants_team_id_fkey,
  drop constraint if exists team_permission_grants_user_id_fkey,
  drop constraint if exists team_permission_grants_granted_by_fkey,
  drop constraint if exists team_permission_grants_team_org_id_teams_id_org_id_fkey,
  drop constraint if exists team_permission_grants_user_org_id_users_id_org_id_fkey,
  drop constraint if exists team_permission_grants_granted_by_org_id_users_id_org_id_fkey,
  add constraint team_permission_grants_team_org_id_teams_id_org_id_fkey
    foreign key (team_id, org_id) references public.teams(id, org_id) on delete cascade,
  add constraint team_permission_grants_user_org_id_users_id_org_id_fkey
    foreign key (user_id, org_id) references public.users(id, org_id) on delete cascade,
  add constraint team_permission_grants_granted_by_org_id_users_id_org_id_fkey
    foreign key (granted_by, org_id) references public.users(id, org_id);

create unique index if not exists team_permission_grants_unique_user_team_permission
  on public.team_permission_grants (team_id, user_id, permission_key);

alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.rep_manager_assignments enable row level security;
alter table public.team_permission_grants enable row level security;
