/**
 * Client service for the Oral Exam Practice system.
 * Calls the ai-oral-exam Supabase Edge Function.
 */

import { supabase } from "@/lib/supabase";
import type { AssessmentSourceMode } from "@/types/assessment";
import type { ChatMessage, OralExamEvaluation } from "@/types/oral-exam";

type ExaminerEdgeFunctionResponse = {
    message?: string;
    score?: number;
    total?: number;
    percentage?: number;
    strengths?: { topic: string; percentage: number }[];
    weaknesses?: { topic: string; percentage: number }[];
    feedback?: string;
    error?: string;
};

/**
 * Send the conversation to the AI examiner and get the next response.
 */
export async function sendExaminerMessage(
    category: string,
    topic: string | undefined,
    messages: ChatMessage[],
    totalQuestions: number,
    options?: {
        sourceMode?: AssessmentSourceMode;
        noteIds?: string[];
        targetCategory?: string;
    },
): Promise<string> {
    const { data, error } =
        await supabase.functions.invoke<ExaminerEdgeFunctionResponse>(
            "ai-oral-exam",
            {
                body: {
                    category,
                    topic,
                    action: "ask",
                    totalQuestions,
                    sourceMode: options?.sourceMode,
                    noteIds: options?.noteIds,
                    targetCategory: options?.targetCategory,
                    messages: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                },
            },
        );

    if (error) {
        throw new Error(error.message || "Failed to get examiner response.");
    }

    if (!data || !data.message) {
        throw new Error(data?.error || "Empty examiner response.");
    }

    return data.message;
}

/**
 * Evaluate the full oral exam conversation and return a structured score.
 */
export async function evaluateOralExamSession(
    category: string,
    topic: string | undefined,
    messages: ChatMessage[],
    options?: {
        sourceMode?: AssessmentSourceMode;
        noteIds?: string[];
        targetCategory?: string;
    },
): Promise<OralExamEvaluation> {
    const { data, error } =
        await supabase.functions.invoke<ExaminerEdgeFunctionResponse>(
            "ai-oral-exam",
            {
                body: {
                    category,
                    topic,
                    action: "evaluate",
                    sourceMode: options?.sourceMode,
                    noteIds: options?.noteIds,
                    targetCategory: options?.targetCategory,
                    messages: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                },
            },
        );

    if (error) {
        throw new Error(error.message || "Failed to evaluate exam.");
    }

    if (!data || typeof data.score !== "number") {
        throw new Error(data?.error || "Invalid evaluation response.");
    }

    return {
        score: data.score,
        total: data.total ?? 0,
        percentage: data.percentage ?? 0,
        strengths: data.strengths ?? [],
        weaknesses: data.weaknesses ?? [],
        feedback: data.feedback ?? "",
    };
}
