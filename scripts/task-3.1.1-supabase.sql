-- Task 3.1.1 - AI job scaffolding for edge-function polling

create table if not exists public.notes_ai_jobs (
  id text primary key,
  note_id text not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null check (task in ('transcription', 'summary', 'flashcards')),
  status text not null check (status in ('queued', 'processing', 'completed', 'failed')),
  request_payload jsonb,
  result_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_ai_jobs_user_id_created_at_idx
  on public.notes_ai_jobs(user_id, created_at desc);

create index if not exists notes_ai_jobs_note_id_task_created_at_idx
  on public.notes_ai_jobs(note_id, task, created_at desc);

create index if not exists notes_ai_jobs_status_idx
  on public.notes_ai_jobs(status);

alter table public.notes_ai_jobs enable row level security;

drop policy if exists "notes_ai_jobs_select_own" on public.notes_ai_jobs;
create policy "notes_ai_jobs_select_own"
on public.notes_ai_jobs for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notes_ai_jobs_insert_own" on public.notes_ai_jobs;
create policy "notes_ai_jobs_insert_own"
on public.notes_ai_jobs for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "notes_ai_jobs_update_own" on public.notes_ai_jobs;
create policy "notes_ai_jobs_update_own"
on public.notes_ai_jobs for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notes_ai_jobs_delete_own" on public.notes_ai_jobs;
create policy "notes_ai_jobs_delete_own"
on public.notes_ai_jobs for delete
to authenticated
using (auth.uid() = user_id);
