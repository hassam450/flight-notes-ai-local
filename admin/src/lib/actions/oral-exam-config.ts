"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  OralExamScenario,
  AiConfigHistory,
  OralExamScenarioListParams,
} from "@/types/oral-exam-config";
import type { PaginatedResult } from "@/types/user";

export async function getOralExamScenarios(
  params: OralExamScenarioListParams
): Promise<PaginatedResult<OralExamScenario>> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("oral_exam_scenarios")
    .select("*", { count: "exact" });

  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,description.ilike.%${params.search}%`
    );
  }

  const sortBy = params.sortBy ?? "sort_order";
  const sortOrder = params.sortOrder ?? "asc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error)
    throw new Error(`Failed to list oral exam scenarios: ${error.message}`);

  const total = count ?? 0;

  return {
    data: (data ?? []) as OralExamScenario[],
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function createOralExamScenario(input: {
  title: string;
  description?: string;
  category: string;
  topic?: string;
  persona_prompt?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("oral_exam_scenarios").insert({
    title: input.title,
    description: input.description || null,
    category: input.category,
    topic: input.topic || null,
    persona_prompt: input.persona_prompt || null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateOralExamScenario(
  id: string,
  input: {
    title: string;
    description?: string;
    category: string;
    topic?: string;
    persona_prompt?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("oral_exam_scenarios")
    .update({
      title: input.title,
      description: input.description || null,
      category: input.category,
      topic: input.topic || null,
      persona_prompt: input.persona_prompt || null,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteOralExamScenario(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("oral_exam_scenarios")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function saveConfigWithHistory(
  configKey: string,
  configValue: string,
  changedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  // Save to ai_config
  const meta = {
    char_count: configValue.length,
    token_estimate: Math.ceil(configValue.length / 4),
    updated_by: changedBy,
    updated_at: new Date().toISOString(),
  };

  const { error: configError } = await supabase.from("ai_config").upsert(
    {
      config_key: configKey,
      config_value: configValue,
      metadata: meta,
    },
    { onConflict: "config_key" }
  );

  if (configError) return { success: false, error: configError.message };

  // Save to history
  const { error: historyError } = await supabase
    .from("ai_config_history")
    .insert({
      config_key: configKey,
      config_value: configValue,
      changed_by: changedBy || null,
    });

  if (historyError) {
    // Non-fatal — config was saved, history failed
    console.error("Failed to save config history:", historyError.message);
  }

  return { success: true };
}

export async function getConfigHistory(
  configKey: string,
  limit = 20
): Promise<AiConfigHistory[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("ai_config_history")
    .select("*")
    .eq("config_key", configKey)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as AiConfigHistory[];
}
