import type { SavedRecordingMeta } from "@/types/recorder";

const DB_NAME = "flight-notes.db";
const TABLE_NAME = "notes_local";

type SQLiteDatabase = {
  execAsync: (source: string) => Promise<void>;
  runAsync: (source: string, ...params: unknown[]) => Promise<unknown>;
  getFirstAsync: <T>(source: string, ...params: unknown[]) => Promise<T | null>;
  getAllAsync: <T>(source: string, ...params: unknown[]) => Promise<T[]>;
};

type SQLiteModule = {
  openDatabaseAsync: (name: string) => Promise<SQLiteDatabase>;
};

let sqliteModule: SQLiteModule | null = null;
let dbPromise: Promise<SQLiteDatabase> | null = null;

type RecordingRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  duration_sec: number;
  local_file_uri: string;
  status: string;
  upload_progress: number;
  remote_path: string | null;
  remote_url: string | null;
  upload_error: string | null;
  source_type: string;
  category: string;
  original_file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
};

function getDatabase() {
  if (!sqliteModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sqliteModule = require("expo-sqlite") as SQLiteModule;
    } catch {
      sqliteModule = null;
    }
  }

  if (!sqliteModule) {
    throw new Error("expo-sqlite is unavailable. Install it and rebuild the app.");
  }

  if (!dbPromise) {
    dbPromise = sqliteModule.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

function mapRowToMeta(row: RecordingRow): SavedRecordingMeta {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    durationSec: row.duration_sec,
    localFileUri: row.local_file_uri,
    status: row.status as SavedRecordingMeta["status"],
    uploadProgress: row.upload_progress,
    remotePath: row.remote_path ?? undefined,
    remoteUrl: row.remote_url ?? undefined,
    uploadError: row.upload_error,
    sourceType: row.source_type as SavedRecordingMeta["sourceType"],
    category: row.category,
    originalFileName: row.original_file_name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
  };
}

function getFirstSql<T>(db: SQLiteDatabase, source: string, params: unknown[] = []) {
  const prepared = params.map(toSqlValue);
  return db.getFirstAsync<T>(source, ...prepared).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Kotlin type")) {
      throw error;
    }
    return db.getFirstAsync<T>(source, prepared as unknown);
  });
}

function getAllSql<T>(db: SQLiteDatabase, source: string, params: unknown[] = []) {
  const prepared = params.map(toSqlValue);
  return db.getAllAsync<T>(source, ...prepared).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Kotlin type")) {
      throw error;
    }
    return db.getAllAsync<T>(source, prepared as unknown);
  });
}

function toSqlValue(value: unknown): string | number | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();

  // Expo SQLite native bridge rejects object parameters on Android.
  return String(value);
}

function toSqlLiteral(value: unknown): string {
  const normalized = toSqlValue(value);
  if (normalized == null) return "NULL";
  if (typeof normalized === "number") return Number.isFinite(normalized) ? `${normalized}` : "0";
  const escaped = normalized.replace(/'/g, "''");
  return `'${escaped}'`;
}

function interpolateSql(source: string, params: unknown[]) {
  let index = 0;
  return source.replace(/\?/g, () => {
    const current = params[index];
    index += 1;
    return toSqlLiteral(current);
  });
}

async function execSqlWithParams(db: SQLiteDatabase, source: string, params: unknown[] = []) {
  const sql = interpolateSql(source, params);
  await db.execAsync(sql);
}

export async function initRecordingsDb() {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      local_file_uri TEXT NOT NULL,
      status TEXT NOT NULL,
      upload_progress INTEGER NOT NULL DEFAULT 0,
      remote_path TEXT,
      remote_url TEXT,
      upload_error TEXT,
      source_type TEXT NOT NULL,
      category TEXT NOT NULL,
      original_file_name TEXT,
      mime_type TEXT,
      file_size_bytes INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_notes_local_user_id ON ${TABLE_NAME}(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_local_created_at ON ${TABLE_NAME}(created_at DESC);
  `);
}

export async function upsertLocalRecording(item: SavedRecordingMeta) {
  const db = await getDatabase();
  const params = [
    item.id,
    item.userId,
    item.name,
    item.createdAt,
    item.updatedAt,
    item.durationSec,
    item.localFileUri,
    item.status,
    item.uploadProgress,
    item.remotePath ?? null,
    item.remoteUrl ?? null,
    item.uploadError ?? null,
    item.sourceType,
    item.category,
    item.originalFileName ?? null,
    item.mimeType ?? null,
    item.fileSizeBytes ?? null,
  ];

  const badParamIndex = params.findIndex(
    (value) =>
      value != null &&
      !(typeof value === "string" || typeof value === "number" || typeof value === "boolean"),
  );
  if (badParamIndex !== -1) {
    const badValue = params[badParamIndex];
    throw new Error(
      `Invalid SQLite param at index ${badParamIndex}: ${Object.prototype.toString.call(badValue)}`,
    );
  }

  await execSqlWithParams(
    db,
    `INSERT OR REPLACE INTO ${TABLE_NAME} (
      id, user_id, name, created_at, updated_at, duration_sec, local_file_uri, status,
      upload_progress, remote_path, remote_url, upload_error, source_type, category,
      original_file_name, mime_type, file_size_bytes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params,
  );
}

export async function getLocalRecordingById(id: string): Promise<SavedRecordingMeta | null> {
  const db = await getDatabase();
  const row = await getFirstSql<RecordingRow>(db, `SELECT * FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
  if (!row) return null;
  return mapRowToMeta(row);
}

export async function listLocalRecordingsByUser(userId: string): Promise<SavedRecordingMeta[]> {
  const db = await getDatabase();
  const rows = await getAllSql<RecordingRow>(
    db,
    `SELECT * FROM ${TABLE_NAME} WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(mapRowToMeta);
}

export async function updateRecordingUploadProgress(id: string, progress: number) {
  const db = await getDatabase();
  await execSqlWithParams(
    db,
    `UPDATE ${TABLE_NAME} SET upload_progress = ?, updated_at = ? WHERE id = ?`,
    [Math.max(0, Math.min(100, Math.round(progress))), new Date().toISOString(), id],
  );
}

export async function markRecordingUploadSuccess(id: string, remotePath: string, remoteUrl?: string) {
  const db = await getDatabase();
  await execSqlWithParams(
    db,
    `UPDATE ${TABLE_NAME}
     SET status = ?, upload_progress = 100, remote_path = ?, remote_url = ?, upload_error = NULL, updated_at = ?
     WHERE id = ?`,
    ["ready_for_ai", remotePath, remoteUrl ?? null, new Date().toISOString(), id],
  );
}

export async function markRecordingUploadFailed(id: string, error: string) {
  const db = await getDatabase();
  await execSqlWithParams(
    db,
    `UPDATE ${TABLE_NAME}
     SET status = ?, upload_error = ?, updated_at = ?
     WHERE id = ?`,
    ["upload_failed", error, new Date().toISOString(), id],
  );
}
