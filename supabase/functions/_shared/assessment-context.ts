import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import { getUserClient } from "./jobs.ts";

const MAX_NOTES = 5;
const MAX_NOTE_CONTEXT_CHARS = 4000;

type NoteSummaryJson = {
  overview?: unknown;
  keyPoints?: unknown;
  actionItems?: unknown;
  studyQuestions?: unknown;
} | null;

type NoteContextRow = {
  id: string;
  name: string;
  category: string;
  summary_json: NoteSummaryJson;
  transcript_text: string | null;
};

function truncate(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...`;
}

function parseArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function buildSummaryText(summaryJson: NoteSummaryJson) {
  if (!summaryJson || typeof summaryJson !== "object") return "";
  const overview = typeof summaryJson.overview === "string" ? summaryJson.overview.trim() : "";
  const keyPoints = parseArray(summaryJson.keyPoints);
  const actionItems = parseArray(summaryJson.actionItems);
  const studyQuestions = parseArray(summaryJson.studyQuestions);

  const lines = [
    overview ? `Overview: ${overview}` : "",
    keyPoints.length ? `Key points: ${keyPoints.join(" | ")}` : "",
    actionItems.length ? `Action items: ${actionItems.join(" | ")}` : "",
    studyQuestions.length ? `Study questions: ${studyQuestions.join(" | ")}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

async function fetchNotesByIds(client: SupabaseClient, noteIds: string[]) {
  const { data, error } = await client
    .from("notes")
    .select("id, name, category, summary_json, transcript_text")
    .in("id", noteIds)
    .returns<NoteContextRow[]>();

  if (error) {
    throw new Error(`Could not fetch selected notes: ${error.message}`);
  }

  return data ?? [];
}

export function parseNotesAiInput(
  body: Record<string, unknown>,
  allowedCategories: string[],
): { noteIds: string[]; targetCategory: string } {
  const noteIds = Array.isArray(body.noteIds)
    ? body.noteIds
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const unique = Array.from(new Set(noteIds)).slice(0, MAX_NOTES);
  if (unique.length === 0) {
    throw new Error("`noteIds` is required when sourceMode=notes_ai.");
  }

  const targetCategory = typeof body.targetCategory === "string" ? body.targetCategory.trim() : "";
  if (!targetCategory || !allowedCategories.includes(targetCategory)) {
    throw new Error(`Invalid targetCategory. Allowed: ${allowedCategories.join(", ")}`);
  }

  return {
    noteIds: unique,
    targetCategory,
  };
}

export async function buildNotesAiContext(req: Request, noteIds: string[]) {
  const client = getUserClient(req);
  if (!client) {
    throw new Error("Missing Authorization header.");
  }

  const notes = await fetchNotesByIds(client, noteIds);
  const byId = new Map(notes.map((note) => [note.id, note]));

  const missing = noteIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error("One or more selected notes were not found.");
  }

  const ordered = noteIds.map((id) => byId.get(id)).filter((row): row is NoteContextRow => !!row);

  const sections: string[] = [];
  for (const note of ordered) {
    const summaryText = buildSummaryText(note.summary_json);
    const transcriptText = note.transcript_text?.trim() ?? "";
    const sourceText = summaryText || transcriptText;
    if (!sourceText) continue;

    sections.push(
      [
        `Note: ${note.name}`,
        `Category: ${note.category}`,
        truncate(sourceText, MAX_NOTE_CONTEXT_CHARS),
      ].join("\n"),
    );
  }

  if (sections.length === 0) {
    throw new Error("Selected notes do not contain summary or transcript content yet.");
  }

  return {
    noteCount: sections.length,
    contextText: sections.join("\n\n---\n\n"),
  };
}
