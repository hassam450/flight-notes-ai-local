"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { AiConfig, AiContextDocument } from "@/types/ai-config";

export async function getAiConfig(
  configKey: string
): Promise<AiConfig | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("ai_config")
    .select("*")
    .eq("config_key", configKey)
    .single();

  if (error || !data) return null;
  return data as AiConfig;
}

export async function updateAiConfig(
  configKey: string,
  configValue: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const meta = {
    ...metadata,
    char_count: configValue.length,
    token_estimate: Math.ceil(configValue.length / 4),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("ai_config")
    .upsert(
      {
        config_key: configKey,
        config_value: configValue,
        metadata: meta,
      },
      { onConflict: "config_key" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getContextDocuments(
  configKey: string
): Promise<AiContextDocument[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("ai_context_documents")
    .select("*")
    .eq("config_key", configKey)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to list context documents: ${error.message}`);
  return (data ?? []) as AiContextDocument[];
}

export async function uploadContextDocument(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const configKey = formData.get("config_key") as string;
  const file = formData.get("file") as File;

  if (!file || file.size === 0) {
    return { success: false, error: "File is required" };
  }

  // Upload to storage
  const ext = file.name.split(".").pop() ?? "pdf";
  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `${configKey}/${safeName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("ai-context-docs")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage
    .from("ai-context-docs")
    .getPublicUrl(path);

  // Insert record
  const { error } = await supabase.from("ai_context_documents").insert({
    title,
    description,
    file_url: urlData.publicUrl,
    file_size_bytes: file.size,
    config_key: configKey,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteContextDocument(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  // Soft delete
  const { error } = await supabase
    .from("ai_context_documents")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
