"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  QuizQuestionRow,
  QuizQuestionListParams,
  QuizQuestionStats,
  QuizCategory,
  QuizDifficulty,
  BulkImportResult,
} from "@/types/quiz-question";
import type { PaginatedResult } from "@/types/user";

export async function getQuizQuestions(
  params: QuizQuestionListParams
): Promise<PaginatedResult<QuizQuestionRow>> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("quiz_questions")
    .select("*", { count: "exact" });

  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.topic) {
    query = query.eq("topic", params.topic);
  }
  if (params.difficulty) {
    query = query.eq("difficulty", params.difficulty);
  }
  if (params.search) {
    query = query.or(
      `question_text.ilike.%${params.search}%,explanation.ilike.%${params.search}%,reference.ilike.%${params.search}%`
    );
  }

  const sortBy = params.sortBy ?? "created_at";
  const sortOrder = params.sortOrder ?? "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list quiz questions: ${error.message}`);

  const total = count ?? 0;

  return {
    data: (data ?? []) as QuizQuestionRow[],
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getQuizQuestionStats(): Promise<QuizQuestionStats> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("quiz_questions")
    .select("is_active, category, difficulty");

  if (error)
    throw new Error(`Failed to get quiz question stats: ${error.message}`);

  const rows = data ?? [];
  let total = 0;
  let active = 0;
  const byCategory: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};

  for (const row of rows) {
    total++;
    if (row.is_active) active++;
    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    byDifficulty[row.difficulty] = (byDifficulty[row.difficulty] ?? 0) + 1;
  }

  return { total, active, byCategory, byDifficulty };
}

export async function getQuizQuestionById(
  id: string
): Promise<QuizQuestionRow | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as QuizQuestionRow;
}

export async function createQuizQuestion(input: {
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  topic: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  reference?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  if (input.options.length !== 4) {
    return { success: false, error: "Exactly 4 options are required" };
  }
  if (input.correct_index < 0 || input.correct_index > 3) {
    return { success: false, error: "Correct index must be 0-3" };
  }

  const { error } = await supabase.from("quiz_questions").insert({
    question_text: input.question_text,
    options: input.options,
    correct_index: input.correct_index,
    explanation: input.explanation,
    topic: input.topic,
    category: input.category,
    difficulty: input.difficulty,
    reference: input.reference || null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateQuizQuestion(
  id: string,
  input: {
    question_text: string;
    options: string[];
    correct_index: number;
    explanation: string;
    topic: string;
    category: QuizCategory;
    difficulty: QuizDifficulty;
    reference?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  if (input.options.length !== 4) {
    return { success: false, error: "Exactly 4 options are required" };
  }

  const { error } = await supabase
    .from("quiz_questions")
    .update({
      question_text: input.question_text,
      options: input.options,
      correct_index: input.correct_index,
      explanation: input.explanation,
      topic: input.topic,
      category: input.category,
      difficulty: input.difficulty,
      reference: input.reference || null,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteQuizQuestion(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("quiz_questions")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getDistinctTopics(): Promise<string[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("quiz_questions")
    .select("topic")
    .order("topic");

  if (error) return [];

  const topics = new Set<string>();
  for (const row of data ?? []) {
    topics.add(row.topic);
  }
  return Array.from(topics);
}

interface BulkQuestionInput {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: string | number;
  explanation: string;
  topic: string;
  category: string;
  difficulty: string;
  reference?: string;
}

const VALID_CATEGORIES = new Set([
  "PPL",
  "Instrument",
  "Commercial",
  "Multi-Engine",
  "CFI",
]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function validateRow(
  row: BulkQuestionInput,
  rowIndex: number
): { valid: boolean; error?: string } {
  if (!row.question_text?.trim()) {
    return { valid: false, error: `Row ${rowIndex}: Missing question text` };
  }
  if (!row.option_a?.trim() || !row.option_b?.trim() || !row.option_c?.trim() || !row.option_d?.trim()) {
    return { valid: false, error: `Row ${rowIndex}: All 4 options are required` };
  }
  const correctIdx = Number(row.correct_index);
  if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
    return { valid: false, error: `Row ${rowIndex}: correct_index must be 0-3` };
  }
  if (!row.topic?.trim()) {
    return { valid: false, error: `Row ${rowIndex}: Missing topic` };
  }
  if (!VALID_CATEGORIES.has(row.category)) {
    return {
      valid: false,
      error: `Row ${rowIndex}: Invalid category "${row.category}". Must be one of: PPL, Instrument, Commercial, Multi-Engine, CFI`,
    };
  }
  if (!VALID_DIFFICULTIES.has(row.difficulty || "medium")) {
    return {
      valid: false,
      error: `Row ${rowIndex}: Invalid difficulty "${row.difficulty}". Must be: easy, medium, hard`,
    };
  }
  return { valid: true };
}

export async function bulkImportQuizQuestions(
  rawData: string,
  format: "csv" | "json"
): Promise<BulkImportResult> {
  const result: BulkImportResult = { imported: 0, skipped: 0, errors: [] };

  let rows: BulkQuestionInput[];

  try {
    if (format === "json") {
      rows = JSON.parse(rawData);
      if (!Array.isArray(rows)) {
        return {
          imported: 0,
          skipped: 0,
          errors: [{ row: 0, message: "JSON must be an array of objects" }],
        };
      }
    } else {
      // CSV parsing
      const lines = rawData.trim().split("\n");
      if (lines.length < 2) {
        return {
          imported: 0,
          skipped: 0,
          errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }],
        };
      }

      const headerLine = lines[0];
      const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = [
        "question_text",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "correct_index",
        "topic",
        "category",
      ];
      const missing = requiredHeaders.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        return {
          imported: 0,
          skipped: 0,
          errors: [
            { row: 0, message: `Missing required CSV headers: ${missing.join(", ")}` },
          ],
        };
      }

      rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          result.errors.push({
            row: i + 1,
            message: `Expected ${headers.length} columns but got ${values.length}`,
          });
          result.skipped++;
          continue;
        }
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });
        rows.push(row as unknown as BulkQuestionInput);
      }
    }
  } catch (e) {
    return {
      imported: 0,
      skipped: 0,
      errors: [{ row: 0, message: `Failed to parse ${format}: ${String(e)}` }],
    };
  }

  // Validate and collect valid rows
  const validInserts: {
    question_text: string;
    options: string[];
    correct_index: number;
    explanation: string;
    topic: string;
    category: string;
    difficulty: string;
    reference: string | null;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validation = validateRow(row, i + 1);
    if (!validation.valid) {
      result.errors.push({ row: i + 1, message: validation.error! });
      result.skipped++;
      continue;
    }

    validInserts.push({
      question_text: row.question_text.trim(),
      options: [
        row.option_a.trim(),
        row.option_b.trim(),
        row.option_c.trim(),
        row.option_d.trim(),
      ],
      correct_index: Number(row.correct_index),
      explanation: (row.explanation || "").trim(),
      topic: row.topic.trim(),
      category: row.category.trim(),
      difficulty: (row.difficulty || "medium").trim(),
      reference: row.reference?.trim() || null,
    });
  }

  // Batch insert
  if (validInserts.length > 0) {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("quiz_questions")
      .insert(validInserts);

    if (error) {
      result.errors.push({ row: 0, message: `Database insert failed: ${error.message}` });
    } else {
      result.imported = validInserts.length;
    }
  }

  return result;
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
