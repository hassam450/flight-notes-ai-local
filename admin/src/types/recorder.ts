export type RecorderUiState = "idle" | "recording" | "paused" | "stopped";

export type RecordingStatus = "ready_for_ai" | "uploading" | "upload_failed";
export type RecordingSourceType =
  | "recorded"
  | "imported_audio"
  | "imported_document"
  | "manual_text";

export type RecordingDraft = {
  id: string;
  startedAt: string;
  durationMs: number;
  fileUri: string;
};

export type SavedRecordingMeta = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  durationSec: number;
  localFileUri: string;
  status: RecordingStatus;
  uploadProgress: number;
  remotePath?: string;
  remoteUrl?: string;
  uploadError?: string | null;
  sourceType: RecordingSourceType;
  category: string;
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
};
