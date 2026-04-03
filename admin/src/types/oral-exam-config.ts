export type OralExamScenario = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  topic: string | null;
  persona_prompt: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AiConfigHistory = {
  id: string;
  config_key: string;
  config_value: string;
  changed_by: string | null;
  created_at: string;
};

export interface OralExamScenarioListParams {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
