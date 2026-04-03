# Task 3.1.4 - Flashcard Extraction Logic

This task implements flashcard execution for queued AI jobs with persisted note-level output.

## 1) Apply SQL

Run `scripts/task-3.1.4-supabase.sql` in the Supabase SQL editor.

## 2) Set function secrets

Set these in Supabase project secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `AI_WORKER_CRON_SECRET`

## 3) Deploy functions

Deploy changed functions with JWT verification disabled:

```bash
supabase functions deploy ai-flashcards --no-verify-jwt
supabase functions deploy ai-jobs-worker --no-verify-jwt
supabase functions deploy ai-summary --no-verify-jwt
supabase functions deploy ai-transcription --no-verify-jwt
```

## 4) Configure cron schedule

Create a scheduled invocation for flashcards processing:

- Frequency: every minute (`* * * * *`)
- Method: `POST`
- Path: `/functions/v1/ai-jobs-worker?task=flashcards&limit=3`
- Header: `x-cron-secret: <AI_WORKER_CRON_SECRET>`

Keep the transcription and summary schedules from tasks 3.1.2 and 3.1.3.

## 5) Behavior

- `POST /functions/v1/ai-flashcards`
  - enqueues a `flashcards` job.
- `POST /functions/v1/ai-jobs-worker?task=flashcards&limit=3`
  - claims queued flashcards jobs.
  - source selection order:
    - use `notes.summary_json` when present,
    - otherwise use `notes.transcript_text` for audio notes,
    - otherwise use uploaded PDF content for imported document notes.
  - writes output to:
    - `notes_ai_jobs.result_payload`
    - `notes.flashcards_*` columns.

## 6) Result payload shape

`notes_ai_jobs.result_payload` for `task=flashcards`:

```json
{
  "flashcards": [
    {
      "question": "string",
      "answer": "string",
      "keyPoints": ["string"]
    }
  ],
  "model": "string",
  "inputType": "summary | transcript | pdf",
  "source": {
    "noteId": "string",
    "remotePath": "string | null"
  },
  "tokenUsage": {
    "inputTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0
  },
  "completedAt": "ISO-8601"
}
```

## 7) Manual smoke test

### Audio note (summary preferred)

1. Upload an audio note and allow transcription + summary to complete.
2. Enqueue flashcards by calling `ai-flashcards`.
3. Trigger worker (or wait for cron):

```bash
curl -X POST \
  -H "x-cron-secret: $AI_WORKER_CRON_SECRET" \
  "https://<project-ref>.supabase.co/functions/v1/ai-jobs-worker?task=flashcards&limit=1"
```

4. Validate:
   - `notes_ai_jobs.task = flashcards` has `status = completed`
   - `notes_ai_jobs.result_payload->'flashcards'` exists
   - `notes.flashcards_json` and `notes.flashcards_generated_at` are populated

### PDF fallback

1. Upload a PDF note without summary data.
2. Enqueue flashcards and run worker.
3. Validate `inputType = pdf` in job payload and note-level persistence.
