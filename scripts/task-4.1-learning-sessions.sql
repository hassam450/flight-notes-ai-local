-- Task 4.1 - Learning sessions persistence layer
-- Stores quiz (MCQ) and oral exam results for readiness & mastery tracking

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('mcq', 'oral_exam')),
  category text not null,
  topic text,
  score integer not null,
  total integer not null,
  percentage integer not null,
  time_taken_seconds integer,
  strengths jsonb,
  weaknesses jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_sessions_user_id_idx
  on public.learning_sessions(user_id);

create index if not exists learning_sessions_created_at_idx
  on public.learning_sessions(created_at desc);

create index if not exists learning_sessions_category_idx
  on public.learning_sessions(user_id, category);

alter table public.learning_sessions enable row level security;

-- Users can read their own sessions
drop policy if exists "learning_sessions_select_own" on public.learning_sessions;
create policy "learning_sessions_select_own"
on public.learning_sessions for select
to authenticated
using (auth.uid() = user_id);

-- Users can insert their own sessions
drop policy if exists "learning_sessions_insert_own" on public.learning_sessions;
create policy "learning_sessions_insert_own"
on public.learning_sessions for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can delete their own sessions (for account cleanup)
drop policy if exists "learning_sessions_delete_own" on public.learning_sessions;
create policy "learning_sessions_delete_own"
on public.learning_sessions for delete
to authenticated
using (auth.uid() = user_id);
