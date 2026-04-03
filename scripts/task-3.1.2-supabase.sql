-- Task 3.1.2 - Transcription worker persistence and queue claim function

alter table public.notes
  add column if not exists transcript_text text,
  add column if not exists transcript_language text,
  add column if not exists transcription_model text,
  add column if not exists transcribed_at timestamptz,
  add column if not exists transcription_error text;

create index if not exists notes_transcribed_at_idx
  on public.notes(transcribed_at desc);

create index if not exists notes_transcription_model_idx
  on public.notes(transcription_model);

create or replace function public.claim_next_ai_job(p_task text)
returns table (
  id text,
  note_id text,
  user_id uuid,
  task text,
  status text,
  request_payload jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
declare
  v_job_id text;
begin
  select j.id
  into v_job_id
  from public.notes_ai_jobs j
  where j.task = p_task
    and j.status = 'queued'
  order by j.created_at asc
  for update skip locked
  limit 1;

  if v_job_id is null then
    return;
  end if;

  return query
  update public.notes_ai_jobs j
  set
    status = 'processing',
    updated_at = now()
  where j.id = v_job_id
  returning
    j.id,
    j.note_id,
    j.user_id,
    j.task,
    j.status,
    j.request_payload,
    j.created_at,
    j.updated_at;
end;
$$;
