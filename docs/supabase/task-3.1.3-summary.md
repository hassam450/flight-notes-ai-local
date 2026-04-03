# Task 3.1.3 - Summarization Prompt Engineering

This task implements summary execution for queued AI jobs with structured JSON output.

## 1) Apply SQL

Run `scripts/task-3.1.3-supabase.sql` in the Supabase SQL editor.

## 2) Set function secrets

Set these in Supabase project secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `AI_WORKER_CRON_SECRET`

## 3) Deploy functions

```bash
supabase functions deploy ai-summary
supabase functions deploy ai-jobs-worker
supabase functions deploy ai-transcription
```

`ai-transcription` is included because this task chains summary enqueue after transcription completion.

## 4) Configure cron schedule

Create a scheduled invocation for summary processing:

- Frequency: every minute (`* * * * *`)
- Method: `POST`
- Path: `/functions/v1/ai-jobs-worker?task=summary&limit=3`
- Header: `x-cron-secret: <AI_WORKER_CRON_SECRET>`

Keep the transcription worker schedule from task 3.1.2.

## 5) Behavior

- `POST /functions/v1/ai-summary`
  - enqueues a `summary` job.
- `POST /functions/v1/ai-jobs-worker?task=summary&limit=3`
  - claims queued summary jobs.
  - for audio notes: summarizes `notes.transcript_text`.
  - for imported PDFs: uploads the file to OpenAI and summarizes the file content.
  - writes output to:
    - `notes_ai_jobs.result_payload`
    - `notes.summary_*` columns.
- Transcription chaining:
  - successful transcription automatically enqueues a summary job if one is not already queued/processing.

## 6) Result payload shape

`notes_ai_jobs.result_payload` for `task=summary`:

```json
{
  "summary": {
    "overview": "string",
    "keyPoints": ["string"],
    "actionItems": ["string"],
    "studyQuestions": ["string"]
  },
  "model": "string",
  "inputType": "transcript | pdf",
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

### Audio flow

1. Upload an audio note in the app.
2. Confirm transcription job completes.
3. Confirm a summary job is created and completes.
4. Validate:
   - `notes_ai_jobs.task = summary` has `status = completed`
   - `notes_ai_jobs.result_payload->'summary'` exists
   - `notes.summary_json` and `notes.summarized_at` are populated

### PDF flow

1. Upload a PDF note in the app.
2. Confirm summary job is created.
3. Trigger worker (or wait for cron) and validate completion:

```bash
curl -X POST \
  -H "x-cron-secret: $AI_WORKER_CRON_SECRET" \
  "https://<project-ref>.supabase.co/functions/v1/ai-jobs-worker?task=summary&limit=1"
```

4. Validate summary payload and `notes.summary_json` persistence.
