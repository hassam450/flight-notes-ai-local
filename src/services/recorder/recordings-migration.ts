import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "@/constants/storage";
import { upsertLocalRecording } from "@/services/recorder/recordings-db";
import type { SavedRecordingMeta } from "@/types/recorder";

type LegacyRecording = {
  id: string;
  name: string;
  createdAt: string;
  durationSec: number;
  localFileUri: string;
  status?: "ready_for_ai" | "uploading" | "upload_failed";
  sourceType?: "recorded" | "imported_audio" | "imported_document";
  category?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
};

function migrationKey(userId: string) {
  return `${STORAGE_KEYS.recordingsMigrationV1}:${userId}`;
}

export async function migrateLegacyRecordingsForUser(userId: string) {
  const done = await AsyncStorage.getItem(migrationKey(userId));
  if (done === "done") return;

  const raw = await AsyncStorage.getItem(STORAGE_KEYS.recordings);
  if (!raw) {
    await AsyncStorage.setItem(migrationKey(userId), "done");
    return;
  }

  let parsed: LegacyRecording[] = [];
  try {
    const maybeParsed = JSON.parse(raw) as unknown;
    if (Array.isArray(maybeParsed)) {
      parsed = maybeParsed as LegacyRecording[];
    }
  } catch {
    parsed = [];
  }

  for (const item of parsed) {
    const now = new Date().toISOString();
    const migrated: SavedRecordingMeta = {
      id: item.id,
      userId,
      name: item.name,
      createdAt: item.createdAt || now,
      updatedAt: now,
      durationSec: Number.isFinite(item.durationSec) ? item.durationSec : 0,
      localFileUri: item.localFileUri,
      status: item.status ?? "ready_for_ai",
      uploadProgress: item.status === "ready_for_ai" ? 100 : 0,
      sourceType: item.sourceType ?? "recorded",
      category: item.category ?? "Uncategorized",
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      fileSizeBytes: item.fileSizeBytes,
      remotePath: undefined,
      remoteUrl: undefined,
      uploadError: null,
    };

    await upsertLocalRecording(migrated);
  }

  await AsyncStorage.removeItem(STORAGE_KEYS.recordings);
  await AsyncStorage.setItem(migrationKey(userId), "done");
}
