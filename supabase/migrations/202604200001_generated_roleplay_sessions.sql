alter table public.roleplay_sessions
  add column if not exists origin text not null default 'manual' check (origin in ('manual', 'generated_from_call'));

alter table public.roleplay_sessions
  add column if not exists source_call_id uuid references public.calls(id) on delete set null;

alter table public.roleplay_sessions
  add column if not exists focus_mode text not null default 'all' check (focus_mode in ('all', 'category'));

alter table public.roleplay_sessions
  add column if not exists focus_category_slug text;

alter table public.roleplay_sessions
  add column if not exists scenario_summary text;

alter table public.roleplay_sessions
  add column if not exists scenario_brief text;

alter table public.roleplay_sessions
  add constraint roleplay_sessions_source_call_origin_check
  check (
    (origin = 'manual' and source_call_id is null)
    or (origin = 'generated_from_call' and source_call_id is not null)
  );

alter table public.roleplay_sessions
  add constraint roleplay_sessions_focus_mode_category_slug_check
  check (
    (focus_mode = 'all' and focus_category_slug is null)
    or (focus_mode = 'category' and focus_category_slug is not null)
  );
