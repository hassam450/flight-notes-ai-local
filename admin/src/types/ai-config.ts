export type AiConfig = {
  id: string;
  config_key: string;
  config_value: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type AiContextDocument = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_size_bytes: number | null;
  config_key: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// Well-known config keys
export const AI_CONFIG_KEYS = {
  CHATBOT_SYSTEM_PROMPT: "chatbot_system_prompt",
  ORAL_EXAM_SYSTEM_PROMPT: "oral_exam_system_prompt",
  ORAL_EXAM_EVAL_PROMPT: "oral_exam_eval_prompt",
  MCQ_SYSTEM_PROMPT: "mcq_system_prompt",
} as const;

export type AiConfigKey = (typeof AI_CONFIG_KEYS)[keyof typeof AI_CONFIG_KEYS];

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
