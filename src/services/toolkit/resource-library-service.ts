import { supabase } from "@/lib/supabase";
import type {
  ToolkitResource,
  ToolkitResourceCategory,
} from "@/types/toolkit-resource";

type ToolkitResourceRow = {
  id: string;
  slug: string;
  title: string;
  category: ToolkitResourceCategory;
  document_code: string | null;
  description: string;
  pdf_url: string;
  thumbnail_url: string | null;
  keywords: string[] | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapToolkitResource(row: ToolkitResourceRow): ToolkitResource {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    documentCode: row.document_code,
    description: row.description,
    pdfUrl: row.pdf_url,
    thumbnailUrl: row.thumbnail_url,
    keywords: row.keywords ?? [],
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchToolkitResources(): Promise<ToolkitResource[]> {
  const { data, error } = await supabase
    .from("aviation_resources")
    .select(
      "id, slug, title, category, document_code, description, pdf_url, thumbnail_url, keywords, is_featured, sort_order, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true })
    .returns<ToolkitResourceRow[]>();

  if (error) {
    throw new Error(error.message || "Failed to load aviation resources.");
  }

  return (data ?? []).map(mapToolkitResource);
}

export async function fetchToolkitResourceById(resourceId: string) {
  const { data, error } = await supabase
    .from("aviation_resources")
    .select(
      "id, slug, title, category, document_code, description, pdf_url, thumbnail_url, keywords, is_featured, sort_order, created_at, updated_at",
    )
    .eq("id", resourceId)
    .eq("is_active", true)
    .maybeSingle<ToolkitResourceRow>();

  if (error) {
    throw new Error(error.message || "Failed to load resource details.");
  }

  return data ? mapToolkitResource(data) : null;
}
