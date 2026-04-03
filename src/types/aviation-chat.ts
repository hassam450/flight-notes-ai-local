export type AviationChatSourceMode = "general" | "notes_ai";

export type AviationChatThread = {
  id: string;
  title: string;
  category: string;
  sourceMode: AviationChatSourceMode;
  targetCategory: string | null;
  preview: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AviationChatMessageRole = "user" | "assistant";

export type AviationChatMessage = {
  id: string;
  threadId: string;
  role: AviationChatMessageRole;
  content: string;
  model?: string | null;
  tokenUsage?: Record<string, unknown> | null;
  contextMeta?: Record<string, unknown> | null;
  createdAt: string;
};

export type AviationChatStreamDone = {
  model?: string;
  tokenUsage?: Record<string, unknown> | null;
};

export type AviationChatStreamHandlers = {
  onThread?: (threadId: string) => void;
  onDelta?: (delta: string) => void;
  onDone?: (payload: AviationChatStreamDone) => void;
  onError?: (message: string) => void;
};
