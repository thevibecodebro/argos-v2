create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_customers_stripe_customer_id_uq
  on public.billing_customers (stripe_customer_id);
create index if not exists billing_customers_org_id_idx
  on public.billing_customers (org_id);
create index if not exists billing_customers_user_id_idx
  on public.billing_customers (user_id);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  billing_plan_id text not null,
  status text not null,
  seat_count integer not null default 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_seat_count_positive check (seat_count > 0)
);

create unique index if not exists billing_subscriptions_stripe_subscription_id_uq
  on public.billing_subscriptions (stripe_subscription_id);
create index if not exists billing_subscriptions_org_id_idx
  on public.billing_subscriptions (org_id);
create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions (user_id);

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create unique index if not exists stripe_webhook_events_event_id_uq
  on public.stripe_webhook_events (event_id);
create index if not exists stripe_webhook_events_event_type_idx
  on public.stripe_webhook_events (event_type);

create table if not exists public.voice_credit_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  billing_plan_id text not null,
  source_type text not null,
  source_id text not null,
  minutes_granted integer not null,
  minutes_remaining integer not null,
  period_start timestamptz,
  period_end timestamptz,
  expires_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_credit_grants_source_type_check check (source_type in ('subscription_included', 'extra_pack')),
  constraint voice_credit_grants_status_check check (status in ('active', 'depleted', 'expired')),
  constraint voice_credit_grants_minutes_granted_positive check (minutes_granted > 0),
  constraint voice_credit_grants_minutes_remaining_nonnegative check (minutes_remaining >= 0)
);

create unique index if not exists voice_credit_grants_source_uq
  on public.voice_credit_grants (source_type, source_id);
create index if not exists voice_credit_grants_org_status_idx
  on public.voice_credit_grants (org_id, status);
create index if not exists voice_credit_grants_user_status_idx
  on public.voice_credit_grants (user_id, status);

create table if not exists public.voice_usage_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.roleplay_sessions(id) on delete set null,
  source text not null,
  minutes_debited integer not null,
  created_at timestamptz not null default now(),
  constraint voice_usage_events_source_check check (source in ('roleplay_realtime', 'roleplay_tts')),
  constraint voice_usage_events_minutes_debited_positive check (minutes_debited > 0)
);

create unique index if not exists voice_usage_events_idempotency_key_uq
  on public.voice_usage_events (idempotency_key);
create index if not exists voice_usage_events_org_created_at_idx
  on public.voice_usage_events (org_id, created_at);
create index if not exists voice_usage_events_user_created_at_idx
  on public.voice_usage_events (user_id, created_at);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.voice_credit_grants enable row level security;
alter table public.voice_usage_events enable row level security;

revoke all on table public.billing_customers from anon;
revoke all on table public.billing_customers from authenticated;
revoke all on table public.billing_subscriptions from anon;
revoke all on table public.billing_subscriptions from authenticated;
revoke all on table public.stripe_webhook_events from anon;
revoke all on table public.stripe_webhook_events from authenticated;
revoke all on table public.voice_credit_grants from anon;
revoke all on table public.voice_credit_grants from authenticated;
revoke all on table public.voice_usage_events from anon;
revoke all on table public.voice_usage_events from authenticated;
