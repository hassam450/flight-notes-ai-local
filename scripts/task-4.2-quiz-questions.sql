-- Task 4.2 - Quiz question bank for admin-managed MCQ questions

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  options jsonb not null,            -- ["option A", "option B", "option C", "option D"]
  correct_index integer not null check (correct_index between 0 and 3),
  explanation text not null default '',
  topic text not null,               -- e.g. "weather-theory", "airspace", "navigation"
  category text not null check (category in ('PPL', 'Instrument', 'Commercial', 'Multi-Engine', 'CFI')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  reference text,                    -- e.g. "FAR 91.173"
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists quiz_questions_category_idx
  on public.quiz_questions(category);

create index if not exists quiz_questions_topic_idx
  on public.quiz_questions(topic);

create index if not exists quiz_questions_active_idx
  on public.quiz_questions(is_active, category, difficulty);

-- Auto-update updated_at trigger
create or replace function public.set_quiz_questions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_quiz_questions_updated_at on public.quiz_questions;
create trigger trg_quiz_questions_updated_at
  before update on public.quiz_questions
  for each row
  execute function public.set_quiz_questions_updated_at();

-- RLS: authenticated users can read active questions
alter table public.quiz_questions enable row level security;

drop policy if exists "quiz_questions_select_active" on public.quiz_questions;
create policy "quiz_questions_select_active"
on public.quiz_questions for select
to authenticated
using (is_active = true);
