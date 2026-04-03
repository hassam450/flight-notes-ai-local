import { buildNotesAiContext, parseNotesAiInput } from "../_shared/assessment-context.ts";
import { corsHeaders, jsonResponse, optionsResponse } from "../_shared/http.ts";
import { getUserClient } from "../_shared/jobs.ts";
import {
  buildAviationChatSystemPrompt,
  fetchConfigPrompt,
  fetchContextDocSummaries,
} from "../_shared/openai.ts";

type SourceMode = "general" | "notes_ai";

type ThreadRow = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  source_mode: SourceMode;
  target_category: string | null;
  archived_at: string | null;
};

type MessageRow = {
  role: "user" | "assistant";
  content: string;
};

type OpenAiUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

type OpenAiResponsePayload = {
  model?: string;
  output_text?: string;
  usage?: OpenAiUsage;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const ALLOWED_CATEGORIES = [
  "PPL",
  "Instrument",
  "Commercial",
  "Multi-Engine",
  "CFI",
];

function getOpenAiApiKey() {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim() ?? "";
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY runtime variable.");
  }
  return apiKey;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sanitizeCategory(value: unknown) {
  if (typeof value !== "string") return "PPL";
  const trimmed = value.trim();
  return ALLOWED_CATEGORIES.includes(trimmed) ? trimmed : "PPL";
}

function titleFromPrompt(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New Conversation";
  return trimmed.slice(0, 80);
}

function toOpenAiRoleMessage(role: "user" | "assistant", content: string) {
  return {
    role: role === "assistant" ? "assistant" : "user",
    content: [{ type: role === "assistant" ? "output_text" : "input_text", text: content }],
  };
}

function sseEvent(event: string, payload: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function extractResponseText(payload: OpenAiResponsePayload) {
  const direct = payload.output_text?.trim();
  if (direct) return direct;

  for (const outputItem of payload.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (contentItem.type === "output_text" && contentItem.text?.trim()) {
        return contentItem.text.trim();
      }
      if (contentItem.text?.trim()) {
        return contentItem.text.trim();
      }
    }
  }

  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const sourceMode: SourceMode = body.sourceMode === "notes_ai" ? "notes_ai" : "general";
    const shouldStream = body.stream !== false;
    if (!threadId) {
      return jsonResponse(400, { error: "`threadId` is required." });
    }
    if (!message) {
      return jsonResponse(400, { error: "`message` is required." });
    }

    const client = getUserClient(req);
    if (!client) {
      return jsonResponse(401, { error: "Missing Authorization header." });
    }

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user?.id) {
      return jsonResponse(401, { error: "Failed to resolve authenticated user." });
    }

    const userId = user.id;

    const { data: thread, error: threadError } = await client
      .from("aviation_chat_threads")
      .select("id, user_id, title, category, source_mode, target_category, archived_at")
      .eq("id", threadId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .single<ThreadRow>();

    if (threadError || !thread) {
      return jsonResponse(404, { error: "Thread not found." });
    }

    const category = sanitizeCategory(body.category ?? thread.category);
    const targetCategory = sanitizeCategory(body.targetCategory ?? thread.target_category ?? thread.category);

    let noteContext = "";
    let noteIds: string[] = [];
    if (sourceMode === "notes_ai") {
      const parsed = parseNotesAiInput(
        {
          noteIds: body.noteIds,
          targetCategory,
        },
        ALLOWED_CATEGORIES,
      );
      noteIds = parsed.noteIds;
      const context = await buildNotesAiContext(req, parsed.noteIds);
      noteContext = context.contextText;
    }

    const nowIso = new Date().toISOString();
    const userMessagePayload = {
      thread_id: threadId,
      user_id: userId,
      role: "user",
      content: message,
      context_meta: {
        sourceMode,
        noteIds,
        targetCategory,
      },
      created_at: nowIso,
    };

    const { error: insertUserMessageError } = await client
      .from("aviation_chat_messages")
      .insert(userMessagePayload);

    if (insertUserMessageError) {
      return jsonResponse(500, { error: insertUserMessageError.message || "Failed to save user message." });
    }

    if (thread.title === "New Conversation") {
      await client
        .from("aviation_chat_threads")
        .update({ title: titleFromPrompt(message), category, source_mode: sourceMode, target_category: targetCategory })
        .eq("id", threadId)
        .eq("user_id", userId);
    } else {
      await client
        .from("aviation_chat_threads")
        .update({ category, source_mode: sourceMode, target_category: targetCategory })
        .eq("id", threadId)
        .eq("user_id", userId);
    }

    const { data: historyRows, error: historyError } = await client
      .from("aviation_chat_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(30)
      .returns<MessageRow[]>();

    if (historyError) {
      return jsonResponse(500, { error: historyError.message || "Failed to load chat history." });
    }

    // Try admin-configured prompt first, fall back to hardcoded
    const dbPrompt = await fetchConfigPrompt(client, "chatbot_system_prompt");
    const systemPrompt = dbPrompt || buildAviationChatSystemPrompt({
      category: targetCategory,
      sourceMode,
    });

    // Fetch context documents uploaded by admin
    const contextDocs = await fetchContextDocSummaries(client, "chatbot_system_prompt");

    const input: Array<Record<string, unknown>> = [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      ...(contextDocs.length > 0
        ? [
            {
              role: "system",
              content: [{ type: "input_text", text: `Reference materials:\n${contextDocs.join("\n")}` }],
            },
          ]
        : []),
      ...(noteContext
        ? [
            {
              role: "user",
              content: [{ type: "input_text", text: `Notes context:\n${noteContext}` }],
            },
          ]
        : []),
      ...(historyRows ?? []).map((row) => toOpenAiRoleMessage(row.role, row.content)),
    ];

    const apiKey = getOpenAiApiKey();
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        stream: shouldStream,
        input,
        max_output_tokens: 1000,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return jsonResponse(500, {
        error: `OpenAI chat request failed (${upstream.status}): ${text || "Unknown error."}`,
      });
    }

    if (!shouldStream) {
      const payload = (await upstream.json()) as OpenAiResponsePayload;
      const assistantText = extractResponseText(payload);
      if (!assistantText) {
        return jsonResponse(500, { error: "Assistant returned no content." });
      }

      const model = payload.model?.trim() || "gpt-4.1-mini";
      const tokenUsage = payload.usage ?? null;

      const { error: insertAssistantError } = await client
        .from("aviation_chat_messages")
        .insert({
          thread_id: threadId,
          user_id: userId,
          role: "assistant",
          content: assistantText,
          model,
          token_usage: tokenUsage,
          context_meta: {
            sourceMode,
            noteIds,
            targetCategory,
          },
        });

      if (insertAssistantError) {
        return jsonResponse(500, { error: insertAssistantError.message || "Failed to save assistant response." });
      }

      return jsonResponse(200, {
        threadId,
        message: assistantText,
        model,
        tokenUsage,
      });
    }

    if (!upstream.body) {
      return jsonResponse(500, { error: "Streaming response body is not available." });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let assistantText = "";
    let model = "gpt-4.1-mini";
    let tokenUsage: Record<string, unknown> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(sseEvent("thread", { threadId })));

        const reader = upstream.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";

            for (const chunk of chunks) {
              const lines = chunk
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);

              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const payloadText = line.slice(5).trim();
                if (!payloadText || payloadText === "[DONE]") continue;

                const payload = safeJsonParse(payloadText);
                if (!payload) continue;

                const type = typeof payload.type === "string" ? payload.type : "";

                if (type === "response.output_text.delta") {
                  const delta = typeof payload.delta === "string" ? payload.delta : "";
                  if (delta) {
                    assistantText += delta;
                    controller.enqueue(encoder.encode(sseEvent("delta", { delta })));
                  }
                }

                if (type === "response.completed") {
                  const responseData = (payload.response ?? {}) as Record<string, unknown>;
                  const usage = responseData.usage;
                  if (usage && typeof usage === "object") {
                    tokenUsage = usage as Record<string, unknown>;
                  }
                  if (typeof responseData.model === "string" && responseData.model.trim()) {
                    model = responseData.model.trim();
                  }
                }
              }
            }
          }

          const finalAssistantText = assistantText.trim();
          if (finalAssistantText) {
            const { error: insertAssistantError } = await client
              .from("aviation_chat_messages")
              .insert({
                thread_id: threadId,
                user_id: userId,
                role: "assistant",
                content: finalAssistantText,
                model,
                token_usage: tokenUsage,
                context_meta: {
                  sourceMode,
                  noteIds,
                  targetCategory,
                },
              });

            if (insertAssistantError) {
              controller.enqueue(
                encoder.encode(
                  sseEvent("error", { error: insertAssistantError.message || "Failed to save assistant response." }),
                ),
              );
            }
          } else {
            controller.enqueue(encoder.encode(sseEvent("error", { error: "Assistant returned no content." })));
          }

          controller.enqueue(encoder.encode(sseEvent("done", { model, tokenUsage })));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Streaming failed.";
          controller.enqueue(encoder.encode(sseEvent("error", { error: message })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled function error.";
    console.error("ai-chat-stream error:", error);
    if (message.includes("Authorization")) {
      return jsonResponse(401, { error: message });
    }
    if (
      message.includes("required") ||
      message.includes("Invalid") ||
      message.includes("not found") ||
      message.includes("do not contain")
    ) {
      return jsonResponse(400, { error: message });
    }

    return jsonResponse(500, { error: message });
  }
});
