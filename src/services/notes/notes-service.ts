import { supabase } from "@/lib/supabase";
import type { RecordingSourceType, RecordingStatus } from "@/types/recorder";

export type HomeRecentNote = {
  id: string;
  name: string;
  status: RecordingStatus;
  sourceType: RecordingSourceType;
  durationSec: number;
  createdAt: string;
};

type RecentNoteRow = {
  id: string;
  name: string;
  status: RecordingStatus;
  source_type: RecordingSourceType;
  duration_sec: number;
  created_at: string;
};

// ── History Note Types ──────────────────────────────────────────────────────

export type HistoryNote = {
  id: string;
  name: string;
  status: RecordingStatus;
  sourceType: RecordingSourceType;
  durationSec: number;
  createdAt: string;
  category: string;
  previewText: string | null;
  hasSummary: boolean;
};

type HistoryNoteRow = {
  id: string;
  name: string;
  status: RecordingStatus;
  source_type: RecordingSourceType;
  duration_sec: number;
  created_at: string;
  category: string;
  summary_json: Record<string, unknown> | null;
};

/**
 * Fetch paginated notes history for the History screen.
 * Returns notes ordered by most recent first.
 */
export async function fetchNotesHistory(
  limit = 20,
  offset = 0,
): Promise<HistoryNote[]> {
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, name, status, source_type, duration_sec, created_at, category, summary_json",
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<HistoryNoteRow[]>();

  if (error) {
    throw new Error(error.message || "Failed to fetch notes history.");
  }

  return (data ?? []).map((item) => {
    const overview =
      item.summary_json &&
      typeof item.summary_json === "object" &&
      "overview" in item.summary_json &&
      typeof item.summary_json.overview === "string"
        ? item.summary_json.overview
        : null;

    return {
      id: item.id,
      name: item.name,
      status: item.status,
      sourceType: item.source_type,
      durationSec: item.duration_sec,
      createdAt: item.created_at,
      category: item.category ?? "",
      hasSummary: item.summary_json != null,
      previewText: overview,
    };
  });
}

export async function fetchNotesCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("Failed to fetch notes count:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function fetchRecentNotes(limit = 5): Promise<HomeRecentNote[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, name, status, source_type, duration_sec, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RecentNoteRow[]>();

  if (error) {
    throw new Error(error.message || "Failed to fetch recent notes.");
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    sourceType: item.source_type,
    durationSec: item.duration_sec,
    createdAt: item.created_at,
  }));
}
