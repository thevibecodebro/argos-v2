create table if not exists public.rate_limit_buckets (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  window_start timestamptz not null,
  window_seconds integer not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_limit_buckets_window_seconds_positive check (window_seconds > 0),
  constraint rate_limit_buckets_request_count_nonnegative check (request_count >= 0)
);

create unique index if not exists rate_limit_buckets_key_window_uq
  on public.rate_limit_buckets (bucket_key, window_start);

create index if not exists rate_limit_buckets_window_start_idx
  on public.rate_limit_buckets (window_start);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from anon;
revoke all on table public.rate_limit_buckets from authenticated;
