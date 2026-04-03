/**
 * Client service for the MCQ Quiz system.
 * Calls the ai-mcq Supabase Edge Function and provides
 * scoring utilities.
 */

import { supabase } from "@/lib/supabase";
import type {
    QuizAttempt,
    QuizConfig,
    QuizQuestion,
    QuizResult,
    TopicPerformance,
} from "@/types/quiz";

type McqEdgeFunctionResponse = {
    questions: {
        question: string;
        options: [string, string, string, string];
        correctIndex: number;
        explanation: string;
        topic: string;
        reference: string;
    }[];
    error?: string;
};

/**
 * Fetch quiz questions from the ai-mcq Edge Function.
 */
export async function fetchQuizQuestions(
    config: QuizConfig,
): Promise<QuizQuestion[]> {
    const { data, error } = await supabase.functions.invoke<McqEdgeFunctionResponse>("ai-mcq", {
        body: {
            category: config.category,
            count: config.count,
            difficulty: config.difficulty,
            topic: config.topic,
            sourceMode: config.sourceMode,
            noteIds: config.noteIds,
            targetCategory: config.targetCategory,
        },
    });

    if (error) {
        throw new Error(error.message || "Failed to fetch quiz questions.");
    }

    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data?.error || "No questions returned.");
    }

    return data.questions.map((q, index) => ({
        id: index,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        topic: q.topic,
        reference: q.reference,
    }));
}

/**
 * Calculate the final quiz score from user attempts.
 */
export function calculateQuizResult(
    questions: QuizQuestion[],
    attempts: QuizAttempt[],
    timeTakenSeconds: number,
): QuizResult {
    const score = attempts.filter((a) => a.isCorrect).length;
    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    // Group performance by topic
    const topicMap = new Map<
        string,
        { correct: number; total: number }
    >();

    for (let i = 0; i < questions.length; i++) {
        const topic = questions[i].topic;
        const attempt = attempts[i];
        const entry = topicMap.get(topic) || { correct: 0, total: 0 };
        entry.total += 1;
        if (attempt?.isCorrect) {
            entry.correct += 1;
        }
        topicMap.set(topic, entry);
    }

    const allTopics: TopicPerformance[] = [];
    for (const [topic, data] of topicMap) {
        allTopics.push({
            topic,
            correct: data.correct,
            total: data.total,
            percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        });
    }

    // Sort: strengths = highest %, weaknesses = lowest %
    const sorted = [...allTopics].sort((a, b) => b.percentage - a.percentage);
    const strengths = sorted.filter((t) => t.percentage >= 60);
    const weaknesses = sorted.filter((t) => t.percentage < 60);

    return {
        score,
        total,
        percentage,
        attempts,
        strengths,
        weaknesses,
        timeTakenSeconds,
    };
}
