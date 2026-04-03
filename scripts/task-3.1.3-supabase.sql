-- Task 3.1.3 - Summarization persistence columns

alter table public.notes
  add column if not exists summary_json jsonb,
  add column if not exists summary_model text,
  add column if not exists summarized_at timestamptz,
  add column if not exists summary_error text;

create index if not exists notes_summarized_at_idx
  on public.notes(summarized_at desc);

create index if not exists notes_summary_model_idx
  on public.notes(summary_model);
