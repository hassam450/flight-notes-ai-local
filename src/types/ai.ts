import type { RecordingSourceType } from "@/types/recorder";

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
