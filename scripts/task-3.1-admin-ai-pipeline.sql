-- Task 3.1 - Add token/duration tracking columns to notes_ai_jobs for admin dashboard

-- Add performance and cost tracking columns
alter table public.notes_ai_jobs
  add column if not exists duration_ms integer,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists model text;

-- Index for usage queries (completed jobs by date)
create index if not exists notes_ai_jobs_completed_created_at_idx
  on public.notes_ai_jobs(created_at desc)
  where status = 'completed';

-- Index for error queries (failed jobs by date)
create index if not exists notes_ai_jobs_failed_created_at_idx
  on public.notes_ai_jobs(created_at desc)
  where status = 'failed';

-- Index for task type aggregation
create index if not exists notes_ai_jobs_task_status_idx
  on public.notes_ai_jobs(task, status);
