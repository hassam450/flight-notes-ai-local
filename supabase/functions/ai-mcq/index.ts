import { jsonResponse, optionsResponse } from "../_shared/http.ts";
import { buildNotesAiContext, parseNotesAiInput } from "../_shared/assessment-context.ts";
import { getUserClient } from "../_shared/jobs.ts";
import {
    generateMcqQuestions,
    fetchPrebuiltQuestions,
    fetchConfigPrompt,
} from "../_shared/openai.ts";

const ALLOWED_CATEGORIES = [
    "PPL",
    "Instrument",
    "Commercial",
    "Multi-Engine",
    "CFI",
];

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return optionsResponse();
    if (req.method !== "POST") {
        return jsonResponse(405, { error: "Method not allowed." });
    }

    try {
        const body = (await req.json()) as Record<string, unknown>;
        const sourceMode =
            typeof body.sourceMode === "string" && body.sourceMode.trim() === "notes_ai"
                ? "notes_ai"
                : "category";

        let category =
            typeof body.category === "string" ? body.category.trim() : "";
        let noteContext = "";

        if (sourceMode === "notes_ai") {
            const { noteIds, targetCategory } = parseNotesAiInput(body, ALLOWED_CATEGORIES);
            const noteSource = await buildNotesAiContext(req, noteIds);
            category = targetCategory;
            noteContext = noteSource.contextText;
        }

        if (!category || !ALLOWED_CATEGORIES.includes(category)) {
            return jsonResponse(400, {
                error: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(", ")}`,
            });
        }

        const count =
            typeof body.count === "number" ? body.count : undefined;
        const difficulty =
            typeof body.difficulty === "string" ? body.difficulty : undefined;
        const topic =
            typeof body.topic === "string" ? body.topic : undefined;
        const requestedCount = count ?? 10;

        // For category-based quizzes (not notes_ai), try prebuilt questions first
        if (sourceMode !== "notes_ai") {
            const client = getUserClient(req);
            if (client) {
                const prebuilt = await fetchPrebuiltQuestions(client, category, {
                    count: requestedCount,
                    difficulty,
                    topic,
                });

                if (prebuilt.length >= requestedCount) {
                    return jsonResponse(200, {
                        questions: prebuilt,
                        model: "prebuilt",
                        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                    });
                }
            }
        }

        // Fall back to AI generation
        const client = getUserClient(req);
        const mcqPromptOverride = client
            ? (await fetchConfigPrompt(client, "mcq_system_prompt")) ?? undefined
            : undefined;

        const result = await generateMcqQuestions(category, {
            count,
            difficulty,
            topic,
            noteContext: noteContext || undefined,
            systemPromptOverride: mcqPromptOverride,
        });

        return jsonResponse(200, {
            questions: result.questions,
            model: result.model,
            tokenUsage: result.tokenUsage,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unhandled function error.";
        console.error("ai-mcq error:", error);
        if (message.includes("Missing Authorization")) {
            return jsonResponse(401, { error: message });
        }
        if (
            message.includes("Invalid") ||
            message.includes("required") ||
            message.includes("not found") ||
            message.includes("do not contain")
        ) {
            return jsonResponse(400, { error: message });
        }
        return jsonResponse(500, { error: message });
    }
});
