# Task 3.1.2 - Async Transcription Worker

This task implements actual transcription processing for queued jobs.

## 1) Apply SQL

Run `scripts/task-3.1.2-supabase.sql` in the Supabase SQL editor.

## 2) Set function secrets

Set these in Supabase project secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `AI_WORKER_CRON_SECRET`

## 3) Deploy functions

```bash
supabase functions deploy ai-transcription
supabase functions deploy ai-jobs-worker
```

## 4) Configure cron schedule

Create a scheduled invocation for `ai-jobs-worker`:

- Frequency: every minute (`* * * * *`)
- Method: `POST`
- Path: `/functions/v1/ai-jobs-worker?task=transcription&limit=3`
- Header: `x-cron-secret: <AI_WORKER_CRON_SECRET>`

## 5) Behavior

- `POST /functions/v1/ai-transcription`
  - still enqueues a job and returns `202`
  - now rejects `sourceType=imported_document` with `400`
  - immediately attempts to claim and process the same job for faster UX
  - if immediate processing fails, job is returned to `queued` for cron retry
- `POST /functions/v1/ai-jobs-worker?task=transcription&limit=3`
  - claims queued transcription jobs
  - downloads note audio from `notes-files`
  - transcribes audio with OpenAI
  - writes output to:
    - `notes_ai_jobs.result_payload`
    - `notes.transcript_*` columns

## 6) Manual smoke test

1. Upload an audio note from the app.
2. Confirm a queued row in `notes_ai_jobs`.
3. Invoke worker:

```bash
curl -X POST \
  -H "x-cron-secret: $AI_WORKER_CRON_SECRET" \
  "https://<project-ref>.supabase.co/functions/v1/ai-jobs-worker?task=transcription&limit=1"
```

4. Validate:
   - `notes_ai_jobs.status = completed`
   - `notes_ai_jobs.result_payload->>'transcript'` is present
   - `notes.transcript_text` is populated
