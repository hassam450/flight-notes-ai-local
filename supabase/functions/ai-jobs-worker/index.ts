import { jsonResponse, optionsResponse } from "../_shared/http.ts";
import type { AiTask } from "../_shared/jobs.ts";
import {
  claimNextQueuedJob,
  createServiceClient,
  getCronSecret,
  markJobFailed,
  runFlashcardsJob,
  runSummaryJob,
  runTranscriptionJob,
  storeFlashcardsErrorOnNote,
  storeSummaryErrorOnNote,
  storeTranscriptionErrorOnNote,
} from "../_shared/worker-jobs.ts";

type WorkerResult = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  errors: string[];
};

function parseTask(url: URL): AiTask {
  const value = (url.searchParams.get("task") || "transcription").trim();
  if (value !== "transcription" && value !== "summary" && value !== "flashcards") {
    throw new Error("Only task=transcription, task=summary, or task=flashcards is supported.");
  }
  return value;
}

function parseLimit(url: URL) {
  const raw = Number(url.searchParams.get("limit") ?? "3");
  if (!Number.isFinite(raw) || raw < 1) return 3;
  return Math.min(Math.floor(raw), 10);
}

function validateCronSecret(req: Request) {
  const expected = getCronSecret();
  const received = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (!received || received !== expected) {
    return false;
  }
  return true;
}

async function processTaskQueue(limit: number, task: AiTask): Promise<WorkerResult> {
  const client = createServiceClient();
  const result: WorkerResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < limit; i += 1) {
    const job = await claimNextQueuedJob(client, task);
    if (!job) {
      result.skipped += 1;
      break;
    }

    result.processed += 1;

    try {
      if (task === "transcription") {
        await runTranscriptionJob(client, job);
      } else if (task === "summary") {
        await runSummaryJob(client, job);
      } else {
        await runFlashcardsJob(client, job);
      }
      result.completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unhandled ${task} worker error.`;
      const failedAt = new Date().toISOString();
      try {
        await markJobFailed(client, job.id, message, failedAt);
      } catch (markError) {
        const markMessage =
          markError instanceof Error ? markError.message : "Could not mark job failed.";
        result.errors.push(`job=${job.id} ${markMessage}`);
      }
      try {
        if (task === "transcription") {
          await storeTranscriptionErrorOnNote(client, job.note_id, message, failedAt);
        } else if (task === "summary") {
          await storeSummaryErrorOnNote(client, job.note_id, message, failedAt);
        } else {
          await storeFlashcardsErrorOnNote(client, job.note_id, message, failedAt);
        }
      } catch (noteError) {
        const noteMessage =
          noteError instanceof Error
            ? noteError.message
            : task === "transcription"
              ? "Could not set note transcription error."
              : task === "summary"
                ? "Could not set note summary error."
                : "Could not set note flashcards error.";
        result.errors.push(`job=${job.id} ${noteMessage}`);
      }
      result.failed += 1;
      result.errors.push(`job=${job.id} ${message}`);
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }
  if (!validateCronSecret(req)) {
    return jsonResponse(401, { error: "Unauthorized worker invocation." });
  }

  try {
    const url = new URL(req.url);
    const task = parseTask(url);
    const limit = parseLimit(url);
    const output = await processTaskQueue(limit, task);
    return jsonResponse(200, output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled function error.";
    return jsonResponse(500, { error: message });
  }
});
