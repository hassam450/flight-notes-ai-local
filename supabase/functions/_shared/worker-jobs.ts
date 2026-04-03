import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import {
  extractTextFromDocument,
  isOpenAiNativeFile,
} from "./document-text-extractor.ts";
import type { AiTask } from "./jobs.ts";
import {
  extractFlashcardsFromPdfFile,
  extractFlashcardsFromSummary,
  extractFlashcardsFromTranscript,
  summarizePdfFile,
  summarizeTranscript,
  transcribeAudioFile,
  type FlashcardsResult,
  type SummaryResult,
  type SummarySections,
  type TranscriptionResult,
} from "./openai.ts";

type JobRequestPayload = {
  sourceType?: "recorded" | "imported_audio" | "imported_document" | "manual_text";
  remotePath?: string;
  remote_path?: string;
  options?: Record<string, unknown>;
};

export type ClaimedJobRow = {
  id: string;
  note_id: string;
  user_id: string;
  task: AiTask;
  status: "processing";
  request_payload: JobRequestPayload | null;
  created_at: string;
  updated_at: string;
};

type NotesRemotePathRow = {
  remote_path: string | null;
};

type NoteSummarySourceRow = {
  user_id: string;
  source_type: "recorded" | "imported_audio" | "imported_document" | "manual_text";
  remote_path: string | null;
  transcript_text: string | null;
  summary_json: SummarySections | null;
};

function getRuntimeConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY runtime variables.");
  }

  return { supabaseUrl, serviceRoleKey };
}

export function getCronSecret() {
  const cronSecret = Deno.env.get("AI_WORKER_CRON_SECRET")?.trim() ?? "";
  if (!cronSecret) {
    throw new Error("Missing AI_WORKER_CRON_SECRET runtime variable.");
  }
  return cronSecret;
}

export function createServiceClient() {
  const { supabaseUrl, serviceRoleKey } = getRuntimeConfig();
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function claimNextQueuedJob(
  client: SupabaseClient,
  task: AiTask,
): Promise<ClaimedJobRow | null> {
  const { data, error } = await client.rpc("claim_next_ai_job", { p_task: task });
  if (error) {
    throw new Error(`Job claim failed: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] as ClaimedJobRow;
}

export async function claimQueuedJobById(
  client: SupabaseClient,
  jobId: string,
  task: AiTask,
): Promise<ClaimedJobRow | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from("notes_ai_jobs")
    .update({
      status: "processing",
      updated_at: nowIso,
    })
    .eq("id", jobId)
    .eq("task", task)
    .eq("status", "queued")
    .select("id, note_id, user_id, task, status, request_payload, created_at, updated_at")
    .limit(1);

  if (error) {
    throw new Error(`Could not claim AI job by id: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as ClaimedJobRow;
}

export async function resolveRemotePath(client: SupabaseClient, job: ClaimedJobRow) {
  const fromPayload = job.request_payload?.remotePath?.trim() || job.request_payload?.remote_path?.trim();
  if (fromPayload) return fromPayload;

  const { data, error } = await client
    .from("notes")
    .select("remote_path")
    .eq("id", job.note_id)
    .single<NotesRemotePathRow>();

  if (error) {
    throw new Error(`Could not fetch note remote path: ${error.message}`);
  }

  return data.remote_path?.trim() || null;
}

function getStringOption(
  options: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const raw = options?.[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

export async function downloadAudioBlob(client: SupabaseClient, remotePath: string) {
  const { data, error } = await client.storage.from("notes-files").download(remotePath);
  if (error) {
    throw new Error(`Could not download audio file from storage: ${error.message}`);
  }

  return data;
}

export async function markJobCompleted(
  client: SupabaseClient,
  jobId: string,
  resultPayload: Record<string, unknown>,
  atIso: string,
) {
  const { error } = await client
    .from("notes_ai_jobs")
    .update({
      status: "completed",
      result_payload: resultPayload,
      error_message: null,
      updated_at: atIso,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Could not mark AI job completed: ${error.message}`);
  }
}

export async function markJobFailed(
  client: SupabaseClient,
  jobId: string,
  errorMessage: string,
  atIso: string,
) {
  const { error } = await client
    .from("notes_ai_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      updated_at: atIso,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Could not mark AI job failed: ${error.message}`);
  }
}

export async function storeTranscriptionOnNote(
  client: SupabaseClient,
  noteId: string,
  transcription: TranscriptionResult,
  atIso: string,
) {
  const { error } = await client
    .from("notes")
    .update({
      transcript_text: transcription.transcript,
      transcript_language: transcription.language,
      transcription_model: transcription.model,
      transcribed_at: atIso,
      transcription_error: null,
      updated_at: atIso,
    })
    .eq("id", noteId);

  if (error) {
    throw new Error(`Could not save transcript to note: ${error.message}`);
  }
}

export async function storeTranscriptionErrorOnNote(
  client: SupabaseClient,
  noteId: string,
  errorMessage: string,
  atIso: string,
) {
  const { error } = await client
    .from("notes")
    .update({
      transcription_error: errorMessage,
      updated_at: atIso,
    })
    .eq("id", noteId);

  if (error) {
    throw new Error(`Could not save transcription error to note: ${error.message}`);
  }
}

export async function storeSummaryOnNote(
  client: SupabaseClient,
  noteId: string,
  summary: SummaryResult,
  atIso: string,
) {
  const { error } = await client
    .from("notes")
    .update({
      summary_json: summary.summary,
      summary_model: summary.model,
      summarized_at: atIso,
      summary_error: null,
      updated_at: atIso,
    })
    .eq("id", noteId);

  if (error) {
    throw new Error(`Could not save summary to note: ${error.message}`);
  }
}

export async function storeSummaryErrorOnNote(
  client: SupabaseClient,
  noteId: string,
  errorMessage: string,
  atIso: string,
) {
  const { error } = await client
    .from("notes")
    .update({
      summary_error: errorMessage,
      updated_at: atIso,
    })
    .eq("id", noteId);

  if (error) {
    throw new Error(`Could not save summary error to note: ${error.message}`);
  }
}

export async function storeFlashcardsOnNote(
  client: SupabaseClient,
  noteId: string,
  flashcards: FlashcardsResult,
  atIso: string,
) {
  const { error } = await client
    .from("notes")
    .update({
      flashcards_json: flashcards.flashcards,
      flashcards_model: flashcards.model,
      flashcards_generated_at: atIso,
      flashcards_error: null,
      updated_at: atIso,
    })
    .eq("id", noteId);

  if (error) {
    throw new Error(`Could not save flashcards to note: ${error.message}`);
  }
}

export async function storeFlashcardsErrorOnNote(
  client: SupabaseClient,
  noteId: string,
  errorMessage: string,
  atIso: string,
) {
  const { error } = await client
    .from("notes")
    .update({
      flashcards_error: errorMessage,
      updated_at: atIso,
    })
    .eq("id", noteId);

  if (error) {
    throw new Error(`Could not save flashcards error to note: ${error.message}`);
  }
}

export async function setJobBackToQueued(
  client: SupabaseClient,
  jobId: string,
  errorMessage: string,
  atIso: string,
) {
  const { error } = await client
    .from("notes_ai_jobs")
    .update({
      status: "queued",
      error_message: errorMessage,
      updated_at: atIso,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Could not set AI job back to queued: ${error.message}`);
  }
}

export async function runTranscriptionJob(client: SupabaseClient, job: ClaimedJobRow) {
  const remotePath = await resolveRemotePath(client, job);
  if (!remotePath) {
    throw new Error("No remote path available for transcription.");
  }

  const audioBlob = await downloadAudioBlob(client, remotePath);
  const transcription = await transcribeAudioFile(audioBlob, {
    fileName: remotePath.split("/").pop() || `${job.note_id}.m4a`,
  });

  const completedAt = new Date().toISOString();
  const resultPayload = {
    transcript: transcription.transcript,
    language: transcription.language,
    model: transcription.model,
    durationSeconds: transcription.durationSeconds,
    remotePath,
    completedAt,
  };

  await markJobCompleted(client, job.id, resultPayload, completedAt);
  await storeTranscriptionOnNote(client, job.note_id, transcription, completedAt);

  try {
    const summaryJobId = await enqueueSummaryJobForNote(client, job.note_id, {
      sourceType: job.request_payload?.sourceType,
      remotePath,
    });
    await tryFastPathSummaryById(client, summaryJobId);
  } catch (error) {
    console.error(`Could not enqueue/run summary after transcription for note=${job.note_id}:`, error);
  }
}

async function getNoteSummarySource(client: SupabaseClient, noteId: string): Promise<NoteSummarySourceRow> {
  const { data, error } = await client
    .from("notes")
    .select("user_id, source_type, remote_path, transcript_text, summary_json")
    .eq("id", noteId)
    .single<NoteSummarySourceRow>();

  if (error || !data) {
    throw new Error(`Could not fetch note summary source: ${error?.message ?? "Not found."}`);
  }

  return data;
}

async function findActiveSummaryJob(client: SupabaseClient, noteId: string) {
  const { data, error } = await client
    .from("notes_ai_jobs")
    .select("id, status")
    .eq("note_id", noteId)
    .eq("task", "summary")
    .in("status", ["queued", "processing"])
    .limit(1)
    .maybeSingle<{ id: string; status: "queued" | "processing" }>();

  if (error) {
    throw new Error(`Could not check active summary jobs: ${error.message}`);
  }

  return data;
}

export async function enqueueSummaryJobForNote(
  client: SupabaseClient,
  noteId: string,
  fallbackPayload?: { sourceType?: "recorded" | "imported_audio" | "imported_document" | "manual_text"; remotePath?: string },
) {
  const active = await findActiveSummaryJob(client, noteId);
  if (active) return active.id;

  const source = await getNoteSummarySource(client, noteId);
  const sourceType = source.source_type;
  const now = new Date().toISOString();
  const jobId = crypto.randomUUID();
  const payload = {
    noteId,
    sourceType: fallbackPayload?.sourceType ?? sourceType,
    remotePath: fallbackPayload?.remotePath ?? source.remote_path,
    options: {},
  };

  const { error } = await client.from("notes_ai_jobs").insert({
    id: jobId,
    note_id: noteId,
    user_id: source.user_id,
    task: "summary",
    status: "queued",
    request_payload: payload,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Could not enqueue summary job: ${error.message}`);
  }

  return jobId;
}

async function tryFastPathSummaryById(client: SupabaseClient, summaryJobId: string) {
  const claimedJob = await claimQueuedJobById(client, summaryJobId, "summary");
  if (!claimedJob) return;

  try {
    await runSummaryJob(client, claimedJob);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inline summary attempt failed.";
    const nowIso = new Date().toISOString();
    await setJobBackToQueued(client, claimedJob.id, message, nowIso);
  }
}

export async function runSummaryJob(client: SupabaseClient, job: ClaimedJobRow) {
  const source = await getNoteSummarySource(client, job.note_id);
  const sourceType = job.request_payload?.sourceType ?? source.source_type;
  const options = job.request_payload?.options ?? {};
  const model = getStringOption(options, "model");

  let summary: SummaryResult;
  let remotePath: string | null = source.remote_path?.trim() || null;
  let inputType: "transcript" | "pdf";

  if (sourceType === "recorded" || sourceType === "imported_audio") {
    const transcript = source.transcript_text?.trim() || "";
    if (!transcript) {
      throw new Error("Cannot summarize note without transcript text.");
    }
    summary = await summarizeTranscript(transcript, { model });
    inputType = "transcript";
  } else if (sourceType === "manual_text") {
    remotePath = await resolveRemotePath(client, job);
    if (!remotePath) {
      throw new Error("No remote path available for manual text summary.");
    }
    const fileBlob = await downloadAudioBlob(client, remotePath);
    const textContent = await fileBlob.text();
    if (!textContent.trim()) {
      throw new Error("Manual text note is empty.");
    }
    summary = await summarizeTranscript(textContent.trim(), { model });
    inputType = "transcript";
  } else if (sourceType === "imported_document") {
    remotePath = await resolveRemotePath(client, job);
    if (!remotePath) {
      throw new Error("No remote path available for document summary.");
    }
    const fileBlob = await downloadAudioBlob(client, remotePath);
    const docFileName = remotePath.split("/").pop() || `${job.note_id}.pdf`;

    if (isOpenAiNativeFile(docFileName)) {
      summary = await summarizePdfFile(fileBlob, {
        model,
        fileName: docFileName,
      });
      inputType = "pdf";
    } else {
      const extractedText = await extractTextFromDocument(fileBlob, docFileName);
      summary = await summarizeTranscript(extractedText, { model });
      inputType = "transcript";
    }
  } else {
    throw new Error(`Unsupported source type for summary: ${sourceType}`);
  }

  const completedAt = new Date().toISOString();
  const resultPayload = {
    summary: summary.summary,
    model: summary.model,
    inputType,
    source: {
      noteId: job.note_id,
      remotePath,
    },
    tokenUsage: summary.tokenUsage,
    completedAt,
  };

  await markJobCompleted(client, job.id, resultPayload, completedAt);
  await storeSummaryOnNote(client, job.note_id, summary, completedAt);
}

function parseCountOption(options: Record<string, unknown> | undefined) {
  const raw = options?.count;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

export async function runFlashcardsJob(client: SupabaseClient, job: ClaimedJobRow) {
  const source = await getNoteSummarySource(client, job.note_id);
  const sourceType = job.request_payload?.sourceType ?? source.source_type;
  const options = job.request_payload?.options ?? {};
  const model = getStringOption(options, "model");
  const count = parseCountOption(options);

  const summarySource = source.summary_json;
  let flashcards: FlashcardsResult;
  let remotePath: string | null = source.remote_path?.trim() || null;
  let inputType: "summary" | "transcript" | "pdf";

  if (summarySource) {
    flashcards = await extractFlashcardsFromSummary(summarySource, { model, count });
    inputType = "summary";
  } else if (sourceType === "recorded" || sourceType === "imported_audio") {
    const transcript = source.transcript_text?.trim() || "";
    if (!transcript) {
      throw new Error("Cannot generate flashcards without summary or transcript text.");
    }
    flashcards = await extractFlashcardsFromTranscript(transcript, { model, count });
    inputType = "transcript";
  } else if (sourceType === "manual_text") {
    remotePath = await resolveRemotePath(client, job);
    if (!remotePath) {
      throw new Error("No remote path available for manual text flashcards.");
    }
    const fileBlob = await downloadAudioBlob(client, remotePath);
    const textContent = await fileBlob.text();
    if (!textContent.trim()) {
      throw new Error("Manual text note is empty.");
    }
    flashcards = await extractFlashcardsFromTranscript(textContent.trim(), { model, count });
    inputType = "transcript";
  } else if (sourceType === "imported_document") {
    remotePath = await resolveRemotePath(client, job);
    if (!remotePath) {
      throw new Error("No remote path available for document flashcards.");
    }
    const fileBlob = await downloadAudioBlob(client, remotePath);
    const docFileName = remotePath.split("/").pop() || `${job.note_id}.pdf`;

    if (isOpenAiNativeFile(docFileName)) {
      flashcards = await extractFlashcardsFromPdfFile(fileBlob, {
        model,
        count,
        fileName: docFileName,
      });
      inputType = "pdf";
    } else {
      const extractedText = await extractTextFromDocument(fileBlob, docFileName);
      flashcards = await extractFlashcardsFromTranscript(extractedText, { model, count });
      inputType = "transcript";
    }
  } else {
    throw new Error(`Unsupported source type for flashcards: ${sourceType}`);
  }

  const completedAt = new Date().toISOString();
  const resultPayload = {
    flashcards: flashcards.flashcards,
    model: flashcards.model,
    inputType,
    source: {
      noteId: job.note_id,
      remotePath,
    },
    tokenUsage: flashcards.tokenUsage,
    completedAt,
  };

  await markJobCompleted(client, job.id, resultPayload, completedAt);
  await storeFlashcardsOnNote(client, job.note_id, flashcards, completedAt);
}
