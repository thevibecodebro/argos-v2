create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  membership_type text not null check (membership_type in ('rep', 'manager')),
  created_at timestamptz not null default now()
);

create unique index if not exists team_memberships_unique_user_team_type
  on public.team_memberships (team_id, user_id, membership_type);

create table if not exists public.rep_manager_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references public.users(id) on delete cascade,
  manager_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists rep_manager_assignments_unique_rep
  on public.rep_manager_assignments (rep_id);

create table if not exists public.team_permission_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null,
  granted_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists team_permission_grants_unique_user_team_permission
  on public.team_permission_grants (team_id, user_id, permission_key);
