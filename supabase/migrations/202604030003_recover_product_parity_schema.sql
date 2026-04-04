alter table public.calls
  add column if not exists frame_control_score integer,
  add column if not exists rapport_score integer,
  add column if not exists discovery_score integer,
  add column if not exists pain_expansion_score integer,
  add column if not exists solution_score integer,
  add column if not exists objection_score integer,
  add column if not exists closing_score integer,
  add column if not exists confidence text,
  add column if not exists call_stage_reached text,
  add column if not exists strengths jsonb,
  add column if not exists improvements jsonb,
  add column if not exists recommended_drills jsonb,
  add column if not exists transcript jsonb;

create table if not exists public.call_moments (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  timestamp_seconds integer,
  category text,
  observation text,
  recommendation text,
  severity text check (severity in ('strength', 'improvement', 'critical')),
  is_highlight boolean not null default false,
  highlight_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.call_annotations (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  author_id uuid not null references public.users(id),
  timestamp_seconds integer,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text,
  description text,
  skill_category text,
  video_url text,
  quiz_data jsonb,
  order_index integer,
  created_at timestamptz not null default now()
);

create table if not exists public.training_progress (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.users(id) on delete cascade,
  module_id uuid not null references public.training_modules(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'passed', 'failed')),
  score integer,
  attempts integer not null default 0,
  completed_at timestamptz,
  assigned_by uuid references public.users(id),
  assigned_at timestamptz,
  due_date timestamptz
);

create unique index if not exists training_progress_rep_module_unique
  on public.training_progress (rep_id, module_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('call_scored', 'annotation_added', 'module_assigned')),
  title text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references public.users(id) on delete cascade,
  persona text,
  industry text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  overall_score integer,
  transcript jsonb,
  scorecard jsonb,
  status text not null default 'active' check (status in ('active', 'evaluating', 'complete')),
  created_at timestamptz not null default now()
);

create table if not exists public.org_compliance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  acknowledged_by uuid not null references public.users(id),
  acknowledged_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  tos_version text,
  metadata jsonb
);

create table if not exists public.zoom_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  webhook_token text,
  zoom_user_id text,
  zoom_account_id text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ghl_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  location_id text not null,
  location_name text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_call_moments_call_timestamp
  on public.call_moments (call_id, timestamp_seconds);
create index if not exists idx_call_annotations_call_created_at
  on public.call_annotations (call_id, created_at desc);
create index if not exists idx_training_modules_org_order
  on public.training_modules (org_id, order_index, created_at);
create index if not exists idx_training_progress_rep
  on public.training_progress (rep_id, status);
create index if not exists idx_notifications_user_created_at
  on public.notifications (user_id, created_at desc);
create index if not exists idx_roleplay_sessions_org_created_at
  on public.roleplay_sessions (org_id, created_at desc);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.user_belongs_to_current_org(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = target_user_id
      and org_id = public.current_user_org_id()
  );
$$;

create or replace function public.call_belongs_to_current_org(target_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calls
    where id = target_call_id
      and org_id = public.current_user_org_id()
  );
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

revoke all on function public.user_belongs_to_current_org(uuid) from public;
grant execute on function public.user_belongs_to_current_org(uuid) to authenticated;

revoke all on function public.call_belongs_to_current_org(uuid) from public;
grant execute on function public.call_belongs_to_current_org(uuid) to authenticated;

alter table public.call_moments enable row level security;
alter table public.call_annotations enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_progress enable row level security;
alter table public.notifications enable row level security;
alter table public.roleplay_sessions enable row level security;
alter table public.org_compliance enable row level security;
alter table public.zoom_integrations enable row level security;
alter table public.ghl_integrations enable row level security;

drop policy if exists "org_members_can_read_call_moments" on public.call_moments;
create policy "org_members_can_read_call_moments" on public.call_moments
for select to authenticated
using (public.call_belongs_to_current_org(call_id));

drop policy if exists "managers_can_manage_call_moments" on public.call_moments;
create policy "managers_can_manage_call_moments" on public.call_moments
for all to authenticated
using (
  public.call_belongs_to_current_org(call_id)
  and public.current_user_role() in ('admin', 'manager', 'executive')
)
with check (
  public.call_belongs_to_current_org(call_id)
  and public.current_user_role() in ('admin', 'manager', 'executive')
);

drop policy if exists "org_members_can_read_call_annotations" on public.call_annotations;
create policy "org_members_can_read_call_annotations" on public.call_annotations
for select to authenticated
using (public.call_belongs_to_current_org(call_id));

drop policy if exists "org_members_can_create_call_annotations" on public.call_annotations;
create policy "org_members_can_create_call_annotations" on public.call_annotations
for insert to authenticated
with check (
  public.call_belongs_to_current_org(call_id)
  and author_id = auth.uid()
);

drop policy if exists "authors_and_managers_can_delete_call_annotations" on public.call_annotations;
create policy "authors_and_managers_can_delete_call_annotations" on public.call_annotations
for delete to authenticated
using (
  public.call_belongs_to_current_org(call_id)
  and (
    author_id = auth.uid()
    or public.current_user_role() in ('admin', 'manager', 'executive')
  )
);

drop policy if exists "org_members_can_read_training_modules" on public.training_modules;
create policy "org_members_can_read_training_modules" on public.training_modules
for select to authenticated
using (org_id = public.current_user_org_id());

drop policy if exists "managers_can_manage_training_modules" on public.training_modules;
create policy "managers_can_manage_training_modules" on public.training_modules
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() in ('admin', 'manager', 'executive')
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() in ('admin', 'manager', 'executive')
);

drop policy if exists "users_can_read_training_progress" on public.training_progress;
create policy "users_can_read_training_progress" on public.training_progress
for select to authenticated
using (
  rep_id = auth.uid()
  or (
    public.user_belongs_to_current_org(rep_id)
    and public.current_user_role() in ('admin', 'manager', 'executive')
  )
);

drop policy if exists "users_can_write_training_progress" on public.training_progress;
create policy "users_can_write_training_progress" on public.training_progress
for all to authenticated
using (
  rep_id = auth.uid()
  or (
    public.user_belongs_to_current_org(rep_id)
    and public.current_user_role() in ('admin', 'manager', 'executive')
  )
)
with check (
  rep_id = auth.uid()
  or (
    public.user_belongs_to_current_org(rep_id)
    and public.current_user_role() in ('admin', 'manager', 'executive')
  )
);

drop policy if exists "users_can_read_notifications" on public.notifications;
create policy "users_can_read_notifications" on public.notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "users_can_update_notifications" on public.notifications;
create policy "users_can_update_notifications" on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "org_members_can_read_roleplay_sessions" on public.roleplay_sessions;
create policy "org_members_can_read_roleplay_sessions" on public.roleplay_sessions
for select to authenticated
using (org_id = public.current_user_org_id());

drop policy if exists "org_members_can_create_roleplay_sessions" on public.roleplay_sessions;
create policy "org_members_can_create_roleplay_sessions" on public.roleplay_sessions
for insert to authenticated
with check (
  org_id = public.current_user_org_id()
  and (
    rep_id = auth.uid()
    or public.current_user_role() in ('admin', 'manager', 'executive')
  )
);

drop policy if exists "org_members_can_update_roleplay_sessions" on public.roleplay_sessions;
create policy "org_members_can_update_roleplay_sessions" on public.roleplay_sessions
for update to authenticated
using (org_id = public.current_user_org_id())
with check (org_id = public.current_user_org_id());

drop policy if exists "org_members_can_read_compliance" on public.org_compliance;
create policy "org_members_can_read_compliance" on public.org_compliance
for select to authenticated
using (org_id = public.current_user_org_id());

drop policy if exists "managers_can_insert_compliance" on public.org_compliance;
create policy "managers_can_insert_compliance" on public.org_compliance
for insert to authenticated
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() in ('admin', 'manager', 'executive')
);

drop policy if exists "org_members_can_read_zoom_integrations" on public.zoom_integrations;
create policy "org_members_can_read_zoom_integrations" on public.zoom_integrations
for select to authenticated
using (org_id = public.current_user_org_id());

drop policy if exists "managers_can_manage_zoom_integrations" on public.zoom_integrations;
create policy "managers_can_manage_zoom_integrations" on public.zoom_integrations
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() in ('admin', 'manager', 'executive')
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() in ('admin', 'manager', 'executive')
);

drop policy if exists "org_members_can_read_ghl_integrations" on public.ghl_integrations;
create policy "org_members_can_read_ghl_integrations" on public.ghl_integrations
for select to authenticated
using (org_id = public.current_user_org_id());

drop policy if exists "managers_can_manage_ghl_integrations" on public.ghl_integrations;
create policy "managers_can_manage_ghl_integrations" on public.ghl_integrations
for all to authenticated
using (
  org_id = public.current_user_org_id()
  and public.current_user_role() in ('admin', 'manager', 'executive')
)
with check (
  org_id = public.current_user_org_id()
  and public.current_user_role() in ('admin', 'manager', 'executive')
);
