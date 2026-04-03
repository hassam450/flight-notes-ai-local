import { supabase } from "@/lib/supabase";
import { fetch as expoFetch } from "expo/fetch";
import type {
  AviationChatMessage,
  AviationChatSourceMode,
  AviationChatStreamHandlers,
  AviationChatThread,
} from "@/types/aviation-chat";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

function ensureConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY configuration.",
    );
  }
}

async function getValidAccessToken(forceRefresh = false) {
  const nowSec = Math.floor(Date.now() / 1000);
  const refreshBufferSec = 60;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (
    !forceRefresh &&
    session?.access_token &&
    session.expires_at &&
    session.expires_at > nowSec + refreshBufferSec
  ) {
    return session.access_token;
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) {
    throw new Error("No valid auth session found for chat request.");
  }
  return data.session.access_token;
}

function isJwtErrorMessage(message: string) {
  const value = message.toLowerCase();
  return value.includes("invalid jwt") || value.includes("jwt expired");
}

async function invokeWithAuthRetry<T>(
  functionName: string,
  body: unknown,
  options?: { isStream?: boolean },
): Promise<T | Response> {
  ensureConfig();
  const endpoint = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const invokeOnce = async (accessToken: string) => {
    const fetchImpl = options?.isStream ? expoFetch : fetch;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-user-jwt": accessToken,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let message = `Chat function invocation failed (${response.status})`;
      try {
        const payload = (await response.clone().json()) as {
          error?: string;
          message?: string;
        };
        if (payload.error?.trim()) {
          message = payload.error.trim();
        } else if (payload.message?.trim()) {
          message = payload.message.trim();
        }
      } catch {
        try {
          const text = (await response.clone().text()).trim();
          if (text) message = text;
        } catch {
          // no-op
        }
      }
      const error = new Error(message) as Error & { statusCode?: number };
      error.statusCode = response.status;
      throw error;
    }

    if (options?.isStream) {
      return response;
    }

    return (await response.json()) as T;
  };

  const firstToken = await getValidAccessToken();
  let firstMessage = "Chat function invocation failed";
  try {
    return await invokeOnce(firstToken);
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;

    firstMessage = error instanceof Error ? error.message : firstMessage;
    const shouldRetry = statusCode === 401 || isJwtErrorMessage(firstMessage);
    if (!shouldRetry) {
      throw new Error(firstMessage);
    }
  }

  const retryToken = await getValidAccessToken(true);
  return invokeOnce(retryToken);
}

function parseSseLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payloadText = trimmed.slice(5).trim();
  if (!payloadText) return null;

  try {
    return JSON.parse(payloadText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createThread(input?: {
  title?: string;
  category?: string;
  sourceMode?: AviationChatSourceMode;
  targetCategory?: string;
}) {
  const response = (await invokeWithAuthRetry<{ thread: AviationChatThread }>("ai-chat", {
    action: "create_thread",
    title: input?.title,
    category: input?.category,
    sourceMode: input?.sourceMode,
    targetCategory: input?.targetCategory,
  })) as { thread: AviationChatThread };

  return response.thread;
}

export async function listThreads(limit = 30) {
  const response = (await invokeWithAuthRetry<{ threads: AviationChatThread[] }>("ai-chat", {
    action: "list_threads",
    limit,
  })) as { threads: AviationChatThread[] };

  return response.threads;
}

export async function getThreadMessages(threadId: string, limit = 100, offset = 0) {
  const response = (await invokeWithAuthRetry<{ messages: AviationChatMessage[] }>("ai-chat", {
    action: "get_messages",
    threadId,
    limit,
    offset,
  })) as { messages: AviationChatMessage[] };

  return response.messages;
}

export async function renameThread(threadId: string, title: string) {
  const response = (await invokeWithAuthRetry<{ thread: AviationChatThread }>("ai-chat", {
    action: "rename_thread",
    threadId,
    title,
  })) as { thread: AviationChatThread };

  return response.thread;
}

export async function deleteThread(threadId: string) {
  await invokeWithAuthRetry("ai-chat", {
    action: "delete_thread",
    threadId,
  });
}

export async function streamAssistantReply(
  input: {
    threadId: string;
    message: string;
    sourceMode: AviationChatSourceMode;
    noteIds?: string[];
    targetCategory?: string;
    category?: string;
  },
  handlers: AviationChatStreamHandlers,
) {
  const response = (await invokeWithAuthRetry("ai-chat-stream", input, {
    isStream: true,
  })) as Response;

  if (!response.body || typeof response.body.getReader !== "function") {
    const fallback = (await invokeWithAuthRetry<{
      threadId: string;
      message: string;
      model?: string;
      tokenUsage?: Record<string, unknown> | null;
    }>("ai-chat-stream", {
      ...input,
      stream: false,
    })) as {
      threadId: string;
      message: string;
      model?: string;
      tokenUsage?: Record<string, unknown> | null;
    };

    if (fallback.threadId) {
      handlers.onThread?.(fallback.threadId);
    }
    if (fallback.message) {
      handlers.onDelta?.(fallback.message);
    }
    handlers.onDone?.({
      model: fallback.model,
      tokenUsage: fallback.tokenUsage ?? null,
    });
    return;
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  let buffer = "";
  let currentEvent = "message";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      currentEvent = "message";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("event:")) {
          currentEvent = trimmed.slice(6).trim();
          continue;
        }

        const payload = parseSseLine(trimmed);
        if (!payload) continue;

        if (currentEvent === "thread") {
          const threadId = typeof payload.threadId === "string" ? payload.threadId : "";
          if (threadId) handlers.onThread?.(threadId);
          continue;
        }

        if (currentEvent === "delta") {
          const delta = typeof payload.delta === "string" ? payload.delta : "";
          if (delta) handlers.onDelta?.(delta);
          continue;
        }

        if (currentEvent === "error") {
          const message = typeof payload.error === "string" ? payload.error : "Streaming failed.";
          handlers.onError?.(message);
          continue;
        }

        if (currentEvent === "done") {
          handlers.onDone?.({
            model: typeof payload.model === "string" ? payload.model : undefined,
            tokenUsage:
              payload.tokenUsage && typeof payload.tokenUsage === "object"
                ? (payload.tokenUsage as Record<string, unknown>)
                : null,
          });
          continue;
        }
      }
    }
  }
}
