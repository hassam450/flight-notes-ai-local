export type RecordingSourceType =
  | "recorded"
  | "imported_audio"
  | "imported_document"
  | "manual_text";

export type AiTask = "transcription" | "summary" | "flashcards";
export type AiJobStatus = "queued" | "processing" | "completed" | "failed";

export type CreateAiJobRequest = {
  noteId: string;
  sourceType: RecordingSourceType;
  remotePath?: string;
  options?: Record<string, unknown>;
};

export type CreateAiJobResponse = {
  jobId: string;
  status: "queued";
  task: AiTask;
  createdAt: string;
};

export type AiJobStatusResponse = {
  jobId: string;
  noteId: string;
  task: AiTask;
  status: AiJobStatus;
  error: string | null;
  result: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

// ── Admin dashboard types ──────────────────────────────────────────

export type AiJobRow = {
  id: string;
  note_id: string;
  user_id: string;
  task: AiTask;
  status: AiJobStatus;
  request_payload: Record<string, unknown> | null;
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
  created_at: string;
  updated_at: string;
  // Joined from auth.users
  user_email?: string;
};

export type AiJobListParams = {
  page: number;
  pageSize: number;
  status?: AiJobStatus;
  task?: AiTask;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type AiJobStats = {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  failed24h: number;
  avgDurationMs: number | null;
};

export type TokenUsagePoint = {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type TaskUsageBreakdown = {
  task: AiTask;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  jobCount: number;
};

export type TaskResponseTime = {
  task: AiTask;
  avgDurationMs: number;
  jobCount: number;
};

export type UsageStats = {
  totalTokens: number;
  estimatedCost: number;
  avgResponseMs: number | null;
  totalJobs: number;
};
