"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  ResourceRow,
  ResourceListParams,
  ResourceStats,
  ToolkitResourceCategory,
} from "@/types/toolkit-resource";
import type { PaginatedResult } from "@/types/user";

export async function getResources(
  params: ResourceListParams
): Promise<PaginatedResult<ResourceRow>> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("aviation_resources")
    .select("*", { count: "exact" });

  // Filters
  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.status === "active") {
    query = query.eq("is_active", true);
  } else if (params.status === "inactive") {
    query = query.eq("is_active", false);
  }
  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,document_code.ilike.%${params.search}%,description.ilike.%${params.search}%`
    );
  }

  // Sort
  const sortBy = params.sortBy ?? "sort_order";
  const sortOrder = params.sortOrder ?? "asc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Pagination
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list resources: ${error.message}`);

  const total = count ?? 0;

  return {
    data: (data ?? []) as ResourceRow[],
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getResourceStats(): Promise<ResourceStats> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("aviation_resources")
    .select("is_active, is_featured");

  if (error) throw new Error(`Failed to get resource stats: ${error.message}`);

  const rows = data ?? [];
  let total = 0;
  let active = 0;
  let inactive = 0;
  let featured = 0;

  for (const row of rows) {
    total++;
    if (row.is_active) {
      active++;
    } else {
      inactive++;
    }
    if (row.is_featured) featured++;
  }

  return { total, active, inactive, featured };
}

export async function getResourceById(
  id: string
): Promise<ResourceRow | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("aviation_resources")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ResourceRow;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export async function createResource(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string) || slugify(title);
  const category = formData.get("category") as ToolkitResourceCategory;
  const documentCode = (formData.get("document_code") as string) || null;
  const description = formData.get("description") as string;
  const keywordsRaw = formData.get("keywords") as string;
  const keywords = keywordsRaw
    ? keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean)
    : [];
  const isFeatured = formData.get("is_featured") === "true";
  const sortOrder = Number(formData.get("sort_order")) || 0;

  // Handle PDF upload
  const pdfFile = formData.get("pdf_file") as File | null;
  const pdfUrl = formData.get("pdf_url") as string;
  let finalPdfUrl = pdfUrl;

  if (pdfFile && pdfFile.size > 0) {
    const ext = pdfFile.name.split(".").pop() ?? "pdf";
    const path = `pdfs/${slug}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("aviation-resources")
      .upload(path, pdfFile, { upsert: true, contentType: pdfFile.type });
    if (uploadError)
      return { success: false, error: `PDF upload failed: ${uploadError.message}` };
    const { data: urlData } = supabase.storage
      .from("aviation-resources")
      .getPublicUrl(path);
    finalPdfUrl = urlData.publicUrl;
  }

  if (!finalPdfUrl) {
    return { success: false, error: "A PDF file or URL is required" };
  }

  // Handle thumbnail upload
  const thumbnailFile = formData.get("thumbnail_file") as File | null;
  let thumbnailUrl: string | null = null;

  if (thumbnailFile && thumbnailFile.size > 0) {
    const ext = thumbnailFile.name.split(".").pop() ?? "png";
    const path = `thumbnails/${slug}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("aviation-resources")
      .upload(path, thumbnailFile, {
        upsert: true,
        contentType: thumbnailFile.type,
      });
    if (uploadError)
      return {
        success: false,
        error: `Thumbnail upload failed: ${uploadError.message}`,
      };
    const { data: urlData } = supabase.storage
      .from("aviation-resources")
      .getPublicUrl(path);
    thumbnailUrl = urlData.publicUrl;
  }

  const { error } = await supabase.from("aviation_resources").insert({
    slug,
    title,
    category,
    document_code: documentCode,
    description,
    pdf_url: finalPdfUrl,
    thumbnail_url: thumbnailUrl,
    keywords,
    is_featured: isFeatured,
    sort_order: sortOrder,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateResource(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const title = formData.get("title") as string;
  const slug = (formData.get("slug") as string) || slugify(title);
  const category = formData.get("category") as ToolkitResourceCategory;
  const documentCode = (formData.get("document_code") as string) || null;
  const description = formData.get("description") as string;
  const keywordsRaw = formData.get("keywords") as string;
  const keywords = keywordsRaw
    ? keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean)
    : [];
  const isFeatured = formData.get("is_featured") === "true";
  const sortOrder = Number(formData.get("sort_order")) || 0;

  const updates: Record<string, unknown> = {
    title,
    slug,
    category,
    document_code: documentCode,
    description,
    keywords,
    is_featured: isFeatured,
    sort_order: sortOrder,
  };

  // Handle PDF upload (optional on update)
  const pdfFile = formData.get("pdf_file") as File | null;
  const pdfUrl = formData.get("pdf_url") as string;

  if (pdfFile && pdfFile.size > 0) {
    const ext = pdfFile.name.split(".").pop() ?? "pdf";
    const path = `pdfs/${slug}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("aviation-resources")
      .upload(path, pdfFile, { upsert: true, contentType: pdfFile.type });
    if (uploadError)
      return { success: false, error: `PDF upload failed: ${uploadError.message}` };
    const { data: urlData } = supabase.storage
      .from("aviation-resources")
      .getPublicUrl(path);
    updates.pdf_url = urlData.publicUrl;
  } else if (pdfUrl) {
    updates.pdf_url = pdfUrl;
  }

  // Handle thumbnail upload
  const thumbnailFile = formData.get("thumbnail_file") as File | null;
  if (thumbnailFile && thumbnailFile.size > 0) {
    const ext = thumbnailFile.name.split(".").pop() ?? "png";
    const path = `thumbnails/${slug}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("aviation-resources")
      .upload(path, thumbnailFile, {
        upsert: true,
        contentType: thumbnailFile.type,
      });
    if (uploadError)
      return {
        success: false,
        error: `Thumbnail upload failed: ${uploadError.message}`,
      };
    const { data: urlData } = supabase.storage
      .from("aviation-resources")
      .getPublicUrl(path);
    updates.thumbnail_url = urlData.publicUrl;
  }

  const { error } = await supabase
    .from("aviation_resources")
    .update(updates)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteResource(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  // Soft delete
  const { error } = await supabase
    .from("aviation_resources")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function toggleResourceStatus(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("aviation_resources")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function toggleResourceFeatured(
  id: string,
  isFeatured: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("aviation_resources")
    .update({ is_featured: isFeatured })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function reorderResources(
  items: { id: string; sort_order: number }[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  // Update each item's sort_order
  for (const item of items) {
    const { error } = await supabase
      .from("aviation_resources")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id);
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}
