export type AssessmentSourceMode = "prebuilt" | "notes_ai";

export type ChatMessage = {
  id: string;
  role: "examiner" | "student";
  content: string;
  timestamp: number;
};

export type OralExamConfig = {
  category: string;
  topic?: string;
  totalQuestions: number;
  sourceMode?: AssessmentSourceMode;
  noteIds?: string[];
  targetCategory?: string;
};

export type OralExamEvaluation = {
  score: number;
  total: number;
  percentage: number;
  strengths: { topic: string; percentage: number }[];
  weaknesses: { topic: string; percentage: number }[];
  feedback: string;
};
