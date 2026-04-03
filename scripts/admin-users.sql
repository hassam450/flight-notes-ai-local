-- Admin users table for the admin panel
-- Separate from `profiles` since admin users are a different population
-- (email/password only, not Google/Apple OAuth)

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'viewer' check (role in ('super_admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- No RLS policies = invisible to mobile app users (anon/authenticated key)
-- Admin panel uses service-role key to bypass RLS

-- Updated_at trigger
create or replace function public.handle_admin_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_admin_user_updated
  before update on public.admin_users
  for each row execute procedure public.handle_admin_updated_at();
