export const QUIZ_CATEGORIES = [
  "PPL",
  "Instrument",
  "Commercial",
  "Multi-Engine",
  "CFI",
] as const;

export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];

export const QUIZ_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type QuizDifficulty = (typeof QUIZ_DIFFICULTIES)[number];

export const QUIZ_TOPICS = [
  "weather-theory",
  "airspace",
  "emergency-procedures",
  "navigation",
  "regulations",
  "aerodynamics",
] as const;

export type QuizQuestionRow = {
  id: string;
  question_text: string;
  options: string[]; // always 4 items
  correct_index: number; // 0-3
  explanation: string;
  topic: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  reference: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export interface QuizQuestionListParams {
  page: number;
  pageSize: number;
  search?: string;
  category?: QuizCategory;
  topic?: string;
  difficulty?: QuizDifficulty;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface QuizQuestionStats {
  total: number;
  active: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<string, number>;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export function formatQuizTopic(topic: string): string {
  return topic
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
