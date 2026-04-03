import type { AssessmentSourceMode } from "./assessment";

/**
 * Types for the MCQ Quiz System (Task 4.1)
 */

/** A single MCQ question returned from the AI */
export type QuizQuestion = {
    id: number;
    question: string;
    options: [string, string, string, string];
    correctIndex: number; // 0-3
    explanation: string;
    topic: string; // e.g. "IFR Operations", "Weather Theory"
    reference?: string; // e.g. "FAR 91.173"
};

/** Configuration for requesting a quiz */
export type QuizConfig = {
    category: string; // PPL, Instrument, etc.
    count: number;
    difficulty?: "easy" | "medium" | "hard";
    topic?: string;
    sourceMode?: AssessmentSourceMode;
    noteIds?: string[];
    targetCategory?: string;
};

/** Tracks a single answer attempt */
export type QuizAttempt = {
    questionIndex: number;
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
};

/** Per-topic performance breakdown */
export type TopicPerformance = {
    topic: string;
    correct: number;
    total: number;
    percentage: number;
};

/** Final quiz result */
export type QuizResult = {
    score: number;
    total: number;
    percentage: number;
    attempts: QuizAttempt[];
    strengths: TopicPerformance[];
    weaknesses: TopicPerformance[];
    timeTakenSeconds: number;
};
