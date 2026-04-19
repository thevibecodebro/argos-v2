create table if not exists public.rubrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  version integer not null default 1,
  name text not null,
  description text,
  is_active boolean not null default true,
  is_template boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rubrics_org_active_idx
  on public.rubrics (org_id)
  where is_active = true;

create unique index if not exists rubrics_org_version_uq
  on public.rubrics (org_id, version)
  where org_id is not null;

create table if not exists public.rubric_categories (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.rubrics(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null,
  weight numeric not null default 1.00,
  sort_order integer not null default 0,
  scoring_criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rubric_categories_rubric_id_idx
  on public.rubric_categories (rubric_id);

create unique index if not exists rubric_categories_rubric_slug_uq
  on public.rubric_categories (rubric_id, slug);

create table if not exists public.call_scores (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  rubric_category_id uuid not null references public.rubric_categories(id) on delete cascade,
  score integer not null,
  created_at timestamptz not null default now()
);

create index if not exists call_scores_call_id_idx
  on public.call_scores (call_id);

create index if not exists call_scores_category_id_idx
  on public.call_scores (rubric_category_id);

create unique index if not exists call_scores_call_category_uq
  on public.call_scores (call_id, rubric_category_id);

alter table public.calls
  add column if not exists rubric_id uuid references public.rubrics(id) on delete set null;

alter table public.roleplay_sessions
  add column if not exists rubric_id uuid references public.rubrics(id) on delete set null;

alter table public.rubrics enable row level security;
alter table public.rubric_categories enable row level security;
alter table public.call_scores enable row level security;
