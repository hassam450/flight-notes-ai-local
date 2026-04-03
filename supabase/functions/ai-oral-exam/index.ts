import { jsonResponse, optionsResponse } from "../_shared/http.ts";
import { buildNotesAiContext, parseNotesAiInput } from "../_shared/assessment-context.ts";
import { getUserClient } from "../_shared/jobs.ts";
import type { OralExamMessage } from "../_shared/openai.ts";
import {
    evaluateOralExam,
    generateExaminerResponse,
    fetchConfigPrompt,
} from "../_shared/openai.ts";

const ALLOWED_CATEGORIES = [
    "PPL",
    "Instrument",
    "Commercial",
    "Multi-Engine",
    "CFI",
];

const ALLOWED_ACTIONS = ["ask", "evaluate"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

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

        // Validate category
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

        const topic =
            typeof body.topic === "string" && body.topic.trim()
                ? body.topic.trim()
                : undefined;

        // Validate action
        const action = typeof body.action === "string" ? body.action.trim() : "";
        if (!action || !ALLOWED_ACTIONS.includes(action as Action)) {
            return jsonResponse(400, {
                error: `Invalid action. Allowed: ${ALLOWED_ACTIONS.join(", ")}`,
            });
        }

        // Validate messages
        const messages: OralExamMessage[] = Array.isArray(body.messages)
            ? body.messages
                .filter(
                    (m: unknown) =>
                        m &&
                        typeof m === "object" &&
                        typeof (m as Record<string, unknown>).role === "string" &&
                        typeof (m as Record<string, unknown>).content === "string",
                )
                .map((m: Record<string, unknown>) => ({
                    role: m.role as "examiner" | "student",
                    content: (m.content as string).trim(),
                }))
            : [];

        // Fetch admin-configured prompt overrides
        const client = getUserClient(req);
        let examinerOverride: string | undefined;
        let evalOverride: string | undefined;

        if (client) {
            // Check for scenario-specific persona first
            if (topic) {
                try {
                    const { data: scenario } = await client
                        .from("oral_exam_scenarios")
                        .select("persona_prompt")
                        .eq("category", category)
                        .eq("topic", topic)
                        .eq("is_active", true)
                        .limit(1)
                        .maybeSingle();
                    if (scenario?.persona_prompt) {
                        examinerOverride = scenario.persona_prompt;
                    }
                } catch { /* silent fallback */ }
            }
            // Fall back to global override from ai_config
            if (!examinerOverride) {
                examinerOverride = (await fetchConfigPrompt(client, "oral_exam_system_prompt")) ?? undefined;
            }
            evalOverride = (await fetchConfigPrompt(client, "oral_exam_eval_prompt")) ?? undefined;
        }

        if (action === "ask") {
            const totalQuestions =
                typeof body.totalQuestions === "number"
                    ? body.totalQuestions
                    : undefined;

            const result = await generateExaminerResponse(
                category,
                messages,
                {
                    totalQuestions,
                    topic,
                    noteContext: noteContext || undefined,
                    systemPromptOverride: examinerOverride,
                },
            );

            return jsonResponse(200, {
                message: result.message,
                model: result.model,
                tokenUsage: result.tokenUsage,
            });
        }

        // action === "evaluate"
        if (messages.length < 2) {
            return jsonResponse(400, {
                error: "At least 2 messages are required for evaluation.",
            });
        }

        const result = await evaluateOralExam(category, messages, {
            topic,
            noteContext: noteContext || undefined,
            systemPromptOverride: evalOverride,
        });

        return jsonResponse(200, {
            score: result.score,
            total: result.total,
            percentage: result.percentage,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            feedback: result.feedback,
            model: result.model,
            tokenUsage: result.tokenUsage,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unhandled function error.";
        console.error("ai-oral-exam error:", error);
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
