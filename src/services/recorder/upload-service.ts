import * as FileSystem from "expo-file-system/legacy";

import { supabase } from "@/lib/supabase";
import type { SavedRecordingMeta } from "@/types/recorder";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const NOTES_BUCKET = "notes-files";
const NOTES_TABLE = "notes";

type UploadTask = {
  cancelAsync: () => Promise<void>;
};

const activeUploads = new Map<string, UploadTask>();

export type UploadParams = {
  uploadId: string;
  userId: string;
  noteId: string;
  fileUri: string;
  fileName: string;
  mimeType?: string;
  onProgress?: (progress: number) => void;
};

function ensureSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }
}

function pad(n: number) {
  return `${n}`.padStart(2, "0");
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, "_");
}

function guessMimeFromName(name: string, fallback?: string) {
  if (fallback) return fallback;
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt") || lower.endsWith(".text")) return "text/plain";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  if (lower.endsWith(".xml")) return "text/xml";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".rtf")) return "application/rtf";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  return "application/octet-stream";
}

function buildObjectPath(userId: string, noteId: string, fileName: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  return `${userId}/${year}/${month}/${noteId}-${sanitizeFileName(fileName)}`;
}

export async function uploadNoteFile({
  uploadId,
  userId,
  noteId,
  fileUri,
  fileName,
  mimeType,
  onProgress,
}: UploadParams): Promise<{ remotePath: string }> {
  ensureSupabaseConfig();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to upload files.");
  }

  const remotePath = buildObjectPath(userId, noteId, fileName);
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${NOTES_BUCKET}/${remotePath}`;
  const contentType = guessMimeFromName(fileName, mimeType);

  const task = FileSystem.createUploadTask(
    uploadUrl,
    fileUri,
    {
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      httpMethod: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        "x-upsert": "true",
        "content-type": contentType,
      },
    },
    (event) => {
      if (!event.totalBytesExpectedToSend) return;
      const pct = (event.totalBytesSent / event.totalBytesExpectedToSend) * 100;
      onProgress?.(pct);
    },
  );

  activeUploads.set(uploadId, task);

  try {
    const response = await task.uploadAsync();
    if (!response) {
      throw new Error("Upload failed: no response.");
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Upload failed with status ${response.status}.`);
    }
    onProgress?.(100);
    return { remotePath };
  } finally {
    activeUploads.delete(uploadId);
  }
}

export async function cancelUpload(uploadId: string) {
  const task = activeUploads.get(uploadId);
  if (!task) return;
  try {
    await task.cancelAsync();
  } finally {
    activeUploads.delete(uploadId);
  }
}

export async function upsertRemoteNoteMetadata(item: SavedRecordingMeta) {
  const payload = {
    id: item.id,
    user_id: item.userId,
    name: item.name,
    source_type: item.sourceType,
    category: item.category,
    status: item.status,
    duration_sec: item.durationSec,
    mime_type: item.mimeType ?? null,
    file_size_bytes: item.fileSizeBytes ?? null,
    local_file_uri: item.localFileUri,
    remote_path: item.remotePath ?? null,
    upload_error: item.uploadError ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };

  const { error } = await supabase.from(NOTES_TABLE).upsert(payload, { onConflict: "id" });
  if (error) {
    throw new Error(error.message);
  }
}
