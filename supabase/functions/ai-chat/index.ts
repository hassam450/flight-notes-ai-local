import { jsonResponse, optionsResponse } from "../_shared/http.ts";
import { getUserClient } from "../_shared/jobs.ts";

type SourceMode = "general" | "notes_ai";
type ChatAction =
  | "create_thread"
  | "list_threads"
  | "get_messages"
  | "rename_thread"
  | "delete_thread";

type ThreadRow = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  source_mode: SourceMode;
  target_category: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  token_usage: Record<string, unknown> | null;
  context_meta: Record<string, unknown> | null;
  created_at: string;
};

const ALLOWED_CATEGORIES = [
  "PPL",
  "Instrument",
  "Commercial",
  "Multi-Engine",
  "CFI",
];

function sanitizeTitle(title: unknown) {
  if (typeof title !== "string") return "New Conversation";
  const trimmed = title.trim();
  if (!trimmed) return "New Conversation";
  return trimmed.slice(0, 120);
}

function sanitizeCategory(value: unknown) {
  if (typeof value !== "string") return "PPL";
  const trimmed = value.trim();
  if (!ALLOWED_CATEGORIES.includes(trimmed)) return "PPL";
  return trimmed;
}

async function getAuthenticatedUserId(client: ReturnType<typeof getUserClient>) {
  if (!client) throw new Error("Missing Authorization header.");
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user?.id) {
    throw new Error("Failed to resolve authenticated user.");
  }

  return user.id;
}

async function fetchOwnedThread(client: NonNullable<ReturnType<typeof getUserClient>>, threadId: string, userId: string) {
  const { data, error } = await client
    .from("aviation_chat_threads")
    .select("id, user_id, title, category, source_mode, target_category, last_message_at, created_at, updated_at, archived_at")
    .eq("id", threadId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .single<ThreadRow>();

  if (error || !data) {
    throw new Error("Thread not found.");
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action.trim() as ChatAction : "" as ChatAction;
    const client = getUserClient(req);
    const userId = await getAuthenticatedUserId(client);

    if (action === "create_thread") {
      const title = sanitizeTitle(body.title);
      const category = sanitizeCategory(body.category);
      const sourceMode: SourceMode = body.sourceMode === "notes_ai" ? "notes_ai" : "general";
      const targetCategory = typeof body.targetCategory === "string" ? sanitizeCategory(body.targetCategory) : null;

      const { data, error } = await client!
        .from("aviation_chat_threads")
        .insert({
          user_id: userId,
          title,
          category,
          source_mode: sourceMode,
          target_category: targetCategory,
        })
        .select("id, user_id, title, category, source_mode, target_category, last_message_at, created_at, updated_at, archived_at")
        .single<ThreadRow>();

      if (error || !data) {
        throw new Error(error?.message || "Failed to create thread.");
      }

      return jsonResponse(200, {
        thread: {
          id: data.id,
          title: data.title,
          category: data.category,
          sourceMode: data.source_mode,
          targetCategory: data.target_category,
          lastMessageAt: data.last_message_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    if (action === "list_threads") {
      const limit = typeof body.limit === "number" ? Math.max(1, Math.min(Math.floor(body.limit), 50)) : 30;
      const { data, error } = await client!
        .from("aviation_chat_threads")
        .select("id, user_id, title, category, source_mode, target_category, last_message_at, created_at, updated_at, archived_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("last_message_at", { ascending: false })
        .limit(limit)
        .returns<ThreadRow[]>();

      if (error) {
        throw new Error(error.message || "Failed to load threads.");
      }

      const threadIds = (data ?? []).map((thread) => thread.id);
      const previews = new Map<string, string>();
      if (threadIds.length > 0) {
        const { data: messageRows } = await client!
          .from("aviation_chat_messages")
          .select("thread_id, content, created_at")
          .in("thread_id", threadIds)
          .order("created_at", { ascending: false })
          .returns<Array<{ thread_id: string; content: string; created_at: string }>>();

        for (const row of messageRows ?? []) {
          if (!previews.has(row.thread_id)) {
            previews.set(row.thread_id, row.content.trim());
          }
        }
      }

      return jsonResponse(200, {
        threads: (data ?? []).map((thread) => ({
          id: thread.id,
          title: thread.title,
          category: thread.category,
          sourceMode: thread.source_mode,
          targetCategory: thread.target_category,
          preview: previews.get(thread.id) || "",
          lastMessageAt: thread.last_message_at,
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
        })),
      });
    }

    if (action === "get_messages") {
      const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
      if (!threadId) {
        return jsonResponse(400, { error: "`threadId` is required." });
      }

      await fetchOwnedThread(client!, threadId, userId);

      const limit = typeof body.limit === "number" ? Math.max(1, Math.min(Math.floor(body.limit), 100)) : 100;
      const offset = typeof body.offset === "number" ? Math.max(0, Math.floor(body.offset)) : 0;

      const { data, error } = await client!
        .from("aviation_chat_messages")
        .select("id, thread_id, user_id, role, content, model, token_usage, context_meta, created_at")
        .eq("thread_id", threadId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1)
        .returns<MessageRow[]>();

      if (error) {
        throw new Error(error.message || "Failed to load messages.");
      }

      return jsonResponse(200, {
        messages: (data ?? []).map((message) => ({
          id: message.id,
          threadId: message.thread_id,
          role: message.role,
          content: message.content,
          model: message.model,
          tokenUsage: message.token_usage,
          contextMeta: message.context_meta,
          createdAt: message.created_at,
        })),
      });
    }

    if (action === "rename_thread") {
      const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
      if (!threadId) {
        return jsonResponse(400, { error: "`threadId` is required." });
      }

      const title = sanitizeTitle(body.title);
      await fetchOwnedThread(client!, threadId, userId);

      const { data, error } = await client!
        .from("aviation_chat_threads")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", threadId)
        .eq("user_id", userId)
        .select("id, title, category, source_mode, target_category, last_message_at, created_at, updated_at")
        .single<ThreadRow>();

      if (error || !data) {
        throw new Error(error?.message || "Failed to rename thread.");
      }

      return jsonResponse(200, {
        thread: {
          id: data.id,
          title: data.title,
          category: data.category,
          sourceMode: data.source_mode,
          targetCategory: data.target_category,
          lastMessageAt: data.last_message_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    if (action === "delete_thread") {
      const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
      if (!threadId) {
        return jsonResponse(400, { error: "`threadId` is required." });
      }

      await fetchOwnedThread(client!, threadId, userId);

      const { error } = await client!
        .from("aviation_chat_threads")
        .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", threadId)
        .eq("user_id", userId);

      if (error) {
        throw new Error(error.message || "Failed to delete thread.");
      }

      return jsonResponse(200, { success: true });
    }

    return jsonResponse(400, {
      error: "Invalid action. Allowed: create_thread, list_threads, get_messages, rename_thread, delete_thread",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled function error.";
    console.error("ai-chat error:", error);
    if (message.includes("Authorization")) {
      return jsonResponse(401, { error: message });
    }
    if (message.includes("required") || message.includes("Invalid") || message.includes("not found")) {
      return jsonResponse(400, { error: message });
    }
    return jsonResponse(500, { error: message });
  }
});
