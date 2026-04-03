import type { AssessmentSourceMode } from "./assessment";

/**
 * Types for the Oral Exam Practice system (Task 4.2)
 */

/** A single chat message in the oral exam. */
export type ChatMessage = {
    id: string;
    role: "examiner" | "student";
    content: string;
    timestamp: number;
};

/** Configuration for starting an oral exam session. */
export type OralExamConfig = {
    category: string;
    topic?: string;
    totalQuestions: number;
    sourceMode?: AssessmentSourceMode;
    noteIds?: string[];
    targetCategory?: string;
};

/** Evaluation result returned by the AI after exam completion. */
export type OralExamEvaluation = {
    score: number;
    total: number;
    percentage: number;
    strengths: { topic: string; percentage: number }[];
    weaknesses: { topic: string; percentage: number }[];
    feedback: string;
};
