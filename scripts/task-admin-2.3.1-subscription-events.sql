-- Task Admin 2.3.1: Create subscription_events table for RevenueCat webhook data
-- Run this in Supabase SQL Editor

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rc_event_type text not null,
  rc_event_id text unique,
  product_id text not null,
  store text,
  environment text,
  purchased_at timestamptz,
  expiration_at timestamptz,
  is_trial_period boolean default false,
  currency text,
  price_usd numeric(10,2),
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_subscription_events_user_id on public.subscription_events(user_id);
create index idx_subscription_events_created_at on public.subscription_events(created_at desc);
create index idx_subscription_events_rc_event_type on public.subscription_events(rc_event_type);
create index idx_subscription_events_expiration_at on public.subscription_events(expiration_at);

-- RLS enabled, no policies (admin-only access via service-role key)
alter table public.subscription_events enable row level security;
