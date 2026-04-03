import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import { jsonResponse } from "./http.ts";

export type AiTask = "transcription" | "summary" | "flashcards";

type CreateJobPayload = {
  noteId: string;
  sourceType: "recorded" | "imported_audio" | "imported_document";
  remotePath?: string;
  options?: Record<string, unknown>;
};

type NoteRow = {
  id: string;
  user_id: string;
};

function getRuntimeConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseApiKey = supabaseServiceRoleKey || supabaseAnonKey;

  if (!supabaseUrl || !supabaseApiKey) {
    throw new Error(
      "Missing SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY runtime variables.",
    );
  }

  return { supabaseUrl, supabaseApiKey };
}

export function getUserClient(req: Request) {
  const customToken = req.headers.get("x-user-jwt")?.trim();
  const inboundAuth = req.headers.get("authorization")?.trim();
  const bearerMatch = inboundAuth?.match(/^Bearer\s+(.+)$/i);
  const authHeader = customToken
    ? `Bearer ${customToken}`
    : bearerMatch?.[1]
      ? `Bearer ${bearerMatch[1]}`
      : null;
  if (!authHeader) return null;

  const { supabaseUrl, supabaseApiKey } = getRuntimeConfig();
  return createClient(supabaseUrl, supabaseApiKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

async function parseCreatePayload(req: Request): Promise<CreateJobPayload> {
  const payload = (await req.json()) as Partial<CreateJobPayload>;
  if (!payload.noteId?.trim()) {
    throw new Error("`noteId` is required.");
  }
  if (!payload.sourceType) {
    throw new Error("`sourceType` is required.");
  }
  return {
    noteId: payload.noteId.trim(),
    sourceType: payload.sourceType,
    remotePath: payload.remotePath?.trim(),
    options: payload.options ?? {},
  };
}

async function fetchOwnedNote(client: SupabaseClient, noteId: string) {
  const { data, error } = await client
    .from("notes")
    .select("id, user_id")
    .eq("id", noteId)
    .single<NoteRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function createJobForTask(
  req: Request,
  task: AiTask,
  options?: {
    blockedSourceTypes?: Array<CreateJobPayload["sourceType"]>;
    blockedSourceTypeMessage?: string;
  },
) {
  let payload: CreateJobPayload;
  try {
    payload = await parseCreatePayload(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON payload.";
    return jsonResponse(400, { error: message });
  }

  if (options?.blockedSourceTypes?.includes(payload.sourceType)) {
    return jsonResponse(400, {
      error: options.blockedSourceTypeMessage ?? "Unsupported source type for requested task.",
    });
  }

  const client = getUserClient(req);
  if (!client) {
    return jsonResponse(401, { error: "Missing Authorization header." });
  }

  const note = await fetchOwnedNote(client, payload.noteId);
  if (!note) {
    return jsonResponse(404, { error: "Note not found." });
  }

  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await client.from("notes_ai_jobs").insert({
    id: jobId,
    note_id: payload.noteId,
    user_id: note.user_id,
    task,
    status: "queued",
    request_payload: payload,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    return jsonResponse(500, { error: error.message });
  }

  return jsonResponse(202, {
    jobId,
    status: "queued",
    task,
    createdAt: now,
  });
}

export async function getJobStatus(req: Request) {
  const client = getUserClient(req);
  if (!client) {
    return jsonResponse(401, { error: "Missing Authorization header." });
  }

  const url = new URL(req.url);
  const queryJobId = url.searchParams.get("jobId");
  let bodyJobId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = (await req.json()) as { jobId?: string };
      bodyJobId = body.jobId?.trim() || null;
    } catch {
      bodyJobId = null;
    }
  }
  const segments = url.pathname.split("/").filter(Boolean);
  const functionIndex = segments.indexOf("ai-jobs");
  const pathJobId = functionIndex >= 0 ? segments[functionIndex + 1] : null;
  const jobId = queryJobId?.trim() || bodyJobId || pathJobId;

  if (!jobId) {
    return jsonResponse(400, { error: "Missing job id in route." });
  }

  const { data, error } = await client
    .from("notes_ai_jobs")
    .select(
      "id, note_id, task, status, error_message, result_payload, created_at, updated_at",
    )
    .eq("id", jobId)
    .single<{
      id: string;
      note_id: string;
      task: AiTask;
      status: "queued" | "processing" | "completed" | "failed";
      error_message: string | null;
      result_payload: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    }>();

  if (error || !data) {
    return jsonResponse(404, { error: "Job not found." });
  }

  return jsonResponse(200, {
    jobId: data.id,
    noteId: data.note_id,
    task: data.task,
    status: data.status,
    error: data.error_message,
    result: data.result_payload,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}
