import { supabase } from "@/lib/supabase";

export type AssessmentNote = {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  hasSummary: boolean;
  hasTranscript: boolean;
};

type AssessmentNoteRow = {
  id: string;
  name: string;
  category: string;
  created_at: string;
  summary_json: {
    overview?: unknown;
    keyPoints?: unknown;
    actionItems?: unknown;
    studyQuestions?: unknown;
  } | null;
  transcript_text: string | null;
};

function hasAnySummaryContent(summary: AssessmentNoteRow["summary_json"]) {
  if (!summary || typeof summary !== "object") return false;
  const overview = typeof summary.overview === "string" && summary.overview.trim().length > 0;
  const keyPoints = Array.isArray(summary.keyPoints) && summary.keyPoints.length > 0;
  const actionItems = Array.isArray(summary.actionItems) && summary.actionItems.length > 0;
  const studyQuestions = Array.isArray(summary.studyQuestions) && summary.studyQuestions.length > 0;
  return overview || keyPoints || actionItems || studyQuestions;
}

export async function fetchAssessmentNotes(limit = 50): Promise<AssessmentNote[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, name, category, created_at, summary_json, transcript_text")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AssessmentNoteRow[]>();

  if (error) {
    throw new Error(error.message || "Failed to fetch notes for assessment.");
  }

  return (data ?? [])
    .map((row) => {
      const hasSummary = hasAnySummaryContent(row.summary_json);
      const hasTranscript = typeof row.transcript_text === "string" && row.transcript_text.trim().length > 0;
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        createdAt: row.created_at,
        hasSummary,
        hasTranscript,
      };
    })
    .filter((row) => row.hasSummary || row.hasTranscript);
}
