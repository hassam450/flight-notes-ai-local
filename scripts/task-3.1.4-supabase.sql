-- Task 3.1.4 - Flashcards persistence columns

alter table public.notes
  add column if not exists flashcards_json jsonb,
  add column if not exists flashcards_model text,
  add column if not exists flashcards_generated_at timestamptz,
  add column if not exists flashcards_error text;

create index if not exists notes_flashcards_generated_at_idx
  on public.notes(flashcards_generated_at desc);

create index if not exists notes_flashcards_model_idx
  on public.notes(flashcards_model);
