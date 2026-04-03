# Task 3.1.1 - AI Bridge Scaffolding

This project uses Supabase Edge Functions for AI job endpoint scaffolding.

## 1) Apply SQL

Run `scripts/task-3.1.1-supabase.sql` in the Supabase SQL editor.

## 2) Set function secrets

Set these in Supabase project secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (reserved for later tasks, not used by 3.1.1 handlers yet)

## 3) Deploy functions

```bash
supabase functions deploy ai-transcription
supabase functions deploy ai-summary
supabase functions deploy ai-flashcards
supabase functions deploy ai-jobs
```

## 4) Endpoint contracts

- `POST /functions/v1/ai-transcription`
- `POST /functions/v1/ai-summary`
- `POST /functions/v1/ai-flashcards`
- `GET /functions/v1/ai-jobs?jobId=:jobId`

All endpoints require `Authorization: Bearer <supabase_access_token>`.

POST body:

```json
{
  "noteId": "note_123",
  "sourceType": "recorded",
  "remotePath": "user-id/2026/02/note_123-file.m4a",
  "options": {}
}
```

POST response:

```json
{
  "jobId": "uuid",
  "status": "queued",
  "task": "transcription",
  "createdAt": "2026-02-17T00:00:00.000Z"
}
```

GET response:

```json
{
  "jobId": "uuid",
  "noteId": "note_123",
  "task": "transcription",
  "status": "queued",
  "error": null,
  "result": null,
  "createdAt": "2026-02-17T00:00:00.000Z",
  "updatedAt": "2026-02-17T00:00:00.000Z"
}
```
