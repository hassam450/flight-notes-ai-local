import { supabase } from "@/lib/supabase";
import type {
  AiJobStatusResponse,
  AiTask,
  CreateAiJobRequest,
  CreateAiJobResponse,
} from "@/types/ai";
import type { RecordingSourceType } from "@/types/recorder";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

function ensureConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY configuration.",
    );
  }
}

async function getValidAccessToken(forceRefresh = false) {
  const nowSec = Math.floor(Date.now() / 1000);
  const refreshBufferSec = 60;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (
    !forceRefresh &&
    session?.access_token &&
    session.expires_at &&
    session.expires_at > nowSec + refreshBufferSec
  ) {
    return session.access_token;
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) {
    throw new Error("No valid auth session found for AI request.");
  }
  return data.session.access_token;
}

function isJwtErrorMessage(message: string) {
  const value = message.toLowerCase();
  return value.includes("invalid jwt") || value.includes("jwt expired");
}

async function invokeWithAuthRetry<T>(functionName: string, body: unknown): Promise<T> {
  const endpoint = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const invokeOnce = async (accessToken: string) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-user-jwt": accessToken,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let message = `AI function invocation failed (${response.status})`;
      try {
        const payload = (await response.clone().json()) as {
          error?: string;
          message?: string;
        };
        if (payload.error?.trim()) {
          message = payload.error.trim();
        } else if (payload.message?.trim()) {
          message = payload.message.trim();
        }
      } catch {
        try {
          const text = (await response.clone().text()).trim();
          if (text) message = text;
        } catch {
          // no-op
        }
      }
      const error = new Error(message) as Error & { statusCode?: number };
      error.statusCode = response.status;
      throw error;
    }

    return (await response.json()) as T;
  };

  const firstToken = await getValidAccessToken();
  let firstMessage = "AI function invocation failed";
  try {
    return await invokeOnce(firstToken);
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;
    firstMessage = error instanceof Error ? error.message : "AI function invocation failed";
    const shouldRetry = statusCode === 401 || isJwtErrorMessage(firstMessage);
    if (!shouldRetry) {
      throw new Error(firstMessage);
    }
  }

  const retryToken = await getValidAccessToken(true);
  return invokeOnce(retryToken);
}

async function createJob(
  functionName: string,
  request: CreateAiJobRequest,
): Promise<CreateAiJobResponse> {
  ensureConfig();
  return invokeWithAuthRetry<CreateAiJobResponse>(functionName, request);
}

export function createTranscriptionJob(request: CreateAiJobRequest) {
  return createJob("ai-transcription", request);
}

export function createSummaryJob(request: CreateAiJobRequest) {
  return createJob("ai-summary", request);
}

export function createFlashcardsJob(request: CreateAiJobRequest) {
  return createJob("ai-flashcards", request);
}

export async function getAiJobStatus(jobId: string): Promise<AiJobStatusResponse> {
  ensureConfig();
  return invokeWithAuthRetry<AiJobStatusResponse>("ai-jobs", { jobId });
}

export type NoteTranscriptionState = {
  id: string;
  name: string;
  category: string;
  sourceType: RecordingSourceType;
  remotePath: string | null;
  transcriptText: string | null;
  transcriptLanguage: string | null;
  transcriptionModel: string | null;
  transcribedAt: string | null;
  transcriptionError: string | null;
};

export type NoteSummaryState = {
  id: string;
  name: string;
  category: string;
  sourceType: RecordingSourceType;
  remotePath: string | null;
  summary: {
    overview: string;
    keyPoints: string[];
    actionItems: string[];
    studyQuestions: string[];
  } | null;
  summaryModel: string | null;
  summarizedAt: string | null;
  summaryError: string | null;
};

export type NoteFlashcardsState = {
  id: string;
  name: string;
  category: string;
  sourceType: RecordingSourceType;
  remotePath: string | null;
  flashcards: {
    question: string;
    answer: string;
    keyPoints: string[];
  }[] | null;
  flashcardsModel: string | null;
  flashcardsGeneratedAt: string | null;
  flashcardsError: string | null;
};

export type AiJobRow = {
  id: string;
  note_id: string;
  task: AiTask;
  status: "queued" | "processing" | "completed" | "failed";
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function getNoteTranscriptionState(noteId: string): Promise<NoteTranscriptionState | null> {
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, name, category, source_type, remote_path, transcript_text, transcript_language, transcription_model, transcribed_at, transcription_error",
    )
    .eq("id", noteId)
    .single<{
      id: string;
      name: string;
      category: string;
      source_type: RecordingSourceType;
      remote_path: string | null;
      transcript_text: string | null;
      transcript_language: string | null;
      transcription_model: string | null;
      transcribed_at: string | null;
      transcription_error: string | null;
    }>();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    sourceType: data.source_type,
    remotePath: data.remote_path,
    transcriptText: data.transcript_text,
    transcriptLanguage: data.transcript_language,
    transcriptionModel: data.transcription_model,
    transcribedAt: data.transcribed_at,
    transcriptionError: data.transcription_error,
  };
}

export async function getLatestTranscriptionJob(noteId: string): Promise<AiJobRow | null> {
  const { data, error } = await supabase
    .from("notes_ai_jobs")
    .select("id, note_id, task, status, result_payload, error_message, created_at, updated_at")
    .eq("note_id", noteId)
    .eq("task", "transcription")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<AiJobRow>();

  if (error || !data) return null;
  return data;
}

export async function getNoteSummaryState(noteId: string): Promise<NoteSummaryState | null> {
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, name, category, source_type, remote_path, summary_json, summary_model, summarized_at, summary_error",
    )
    .eq("id", noteId)
    .single<{
      id: string;
      name: string;
      category: string;
      source_type: RecordingSourceType;
      remote_path: string | null;
      summary_json: {
        overview?: unknown;
        keyPoints?: unknown;
        actionItems?: unknown;
        studyQuestions?: unknown;
      } | null;
      summary_model: string | null;
      summarized_at: string | null;
      summary_error: string | null;
    }>();

  if (error || !data) return null;

  const json = data.summary_json;
  const summary =
    json &&
    typeof json.overview === "string" &&
    Array.isArray(json.keyPoints) &&
    Array.isArray(json.actionItems) &&
    Array.isArray(json.studyQuestions)
      ? {
          overview: json.overview,
          keyPoints: json.keyPoints.filter((item): item is string => typeof item === "string"),
          actionItems: json.actionItems.filter((item): item is string => typeof item === "string"),
          studyQuestions: json.studyQuestions.filter((item): item is string => typeof item === "string"),
        }
      : null;

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    sourceType: data.source_type,
    remotePath: data.remote_path,
    summary,
    summaryModel: data.summary_model,
    summarizedAt: data.summarized_at,
    summaryError: data.summary_error,
  };
}

export async function getLatestSummaryJob(noteId: string): Promise<AiJobRow | null> {
  const { data, error } = await supabase
    .from("notes_ai_jobs")
    .select("id, note_id, task, status, result_payload, error_message, created_at, updated_at")
    .eq("note_id", noteId)
    .eq("task", "summary")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<AiJobRow>();

  if (error || !data) return null;
  return data;
}

export async function getNoteFlashcardsState(noteId: string): Promise<NoteFlashcardsState | null> {
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, name, category, source_type, remote_path, flashcards_json, flashcards_model, flashcards_generated_at, flashcards_error",
    )
    .eq("id", noteId)
    .single<{
      id: string;
      name: string;
      category: string;
      source_type: RecordingSourceType;
      remote_path: string | null;
      flashcards_json: {
        question?: unknown;
        answer?: unknown;
        keyPoints?: unknown;
      }[] | null;
      flashcards_model: string | null;
      flashcards_generated_at: string | null;
      flashcards_error: string | null;
    }>();

  if (error || !data) return null;

  const flashcards = Array.isArray(data.flashcards_json)
    ? data.flashcards_json
        .map((item) => {
          const question = typeof item.question === "string" ? item.question : null;
          const answer = typeof item.answer === "string" ? item.answer : null;
          const keyPoints = Array.isArray(item.keyPoints)
            ? item.keyPoints.filter((value): value is string => typeof value === "string")
            : [];
          if (!question || !answer) return null;
          return { question, answer, keyPoints };
        })
        .filter((item): item is { question: string; answer: string; keyPoints: string[] } => !!item)
    : null;

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    sourceType: data.source_type,
    remotePath: data.remote_path,
    flashcards,
    flashcardsModel: data.flashcards_model,
    flashcardsGeneratedAt: data.flashcards_generated_at,
    flashcardsError: data.flashcards_error,
  };
}

export async function getLatestFlashcardsJob(noteId: string): Promise<AiJobRow | null> {
  const { data, error } = await supabase
    .from("notes_ai_jobs")
    .select("id, note_id, task, status, result_payload, error_message, created_at, updated_at")
    .eq("note_id", noteId)
    .eq("task", "flashcards")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<AiJobRow>();

  if (error || !data) return null;
  return data;
}
