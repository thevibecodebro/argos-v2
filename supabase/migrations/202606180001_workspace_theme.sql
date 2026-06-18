alter table public.organizations
  add column if not exists workspace_theme jsonb;
