import {
  getLocalRecordingById,
  listLocalRecordingsByUser,
  markRecordingUploadFailed,
  markRecordingUploadSuccess,
  upsertLocalRecording,
  updateRecordingUploadProgress,
} from "@/services/recorder/recordings-db";
import type { SavedRecordingMeta } from "@/types/recorder";

export async function getSavedRecordings(userId: string): Promise<SavedRecordingMeta[]> {
  return listLocalRecordingsByUser(userId);
}

export async function appendSavedRecording(item: SavedRecordingMeta): Promise<void> {
  await upsertLocalRecording(item);
}

export async function getSavedRecordingById(id: string): Promise<SavedRecordingMeta | null> {
  return getLocalRecordingById(id);
}

export async function setRecordingUploadProgress(id: string, progress: number): Promise<void> {
  await updateRecordingUploadProgress(id, progress);
}

export async function setRecordingUploadSuccess(
  id: string,
  remotePath: string,
  remoteUrl?: string,
): Promise<void> {
  await markRecordingUploadSuccess(id, remotePath, remoteUrl);
}

export async function setRecordingUploadFailed(id: string, error: string): Promise<void> {
  await markRecordingUploadFailed(id, error);
}
