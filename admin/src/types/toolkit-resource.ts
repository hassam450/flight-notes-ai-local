export const TOOLKIT_RESOURCE_CATEGORIES = [
  "all",
  "handbooks",
  "regulations",
  "standards",
  "advisory",
] as const;

export type ToolkitResourceFilterCategory =
  (typeof TOOLKIT_RESOURCE_CATEGORIES)[number];

export type ToolkitResourceCategory = Exclude<
  ToolkitResourceFilterCategory,
  "all"
>;

export type ToolkitResource = {
  id: string;
  slug: string;
  title: string;
  category: ToolkitResourceCategory;
  documentCode: string | null;
  description: string;
  pdfUrl: string;
  thumbnailUrl: string | null;
  keywords: string[];
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// DB row shape (snake_case, matches aviation_resources table)
export type ResourceRow = {
  id: string;
  slug: string;
  title: string;
  category: ToolkitResourceCategory;
  document_code: string | null;
  description: string;
  pdf_url: string;
  thumbnail_url: string | null;
  keywords: string[];
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export interface ResourceListParams {
  page: number;
  pageSize: number;
  search?: string;
  category?: ToolkitResourceCategory;
  status?: "active" | "inactive";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ResourceStats {
  total: number;
  active: number;
  inactive: number;
  featured: number;
}

export function formatToolkitResourceCategory(
  category: ToolkitResourceFilterCategory,
) {
  switch (category) {
    case "all":
      return "All";
    case "handbooks":
      return "Handbooks";
    case "regulations":
      return "Regulations";
    case "standards":
      return "Standards";
    case "advisory":
      return "Advisory";
    default:
      return "All";
  }
}
