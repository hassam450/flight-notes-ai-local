import { headers } from "next/headers";
import { getResources, getResourceStats } from "@/lib/actions/resources";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ResourceDataTable } from "@/components/content/resource-data-table";
import { formatNumber } from "@/lib/format";
import type {
  ResourceListParams,
  ToolkitResourceCategory,
} from "@/types/toolkit-resource";
import { FileText, Eye, EyeOff, Star } from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ResourcesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const adminRole = headersList.get("x-admin-role") ?? "viewer";

  const listParams: ResourceListParams = {
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 25,
    category: (params.category as ToolkitResourceCategory) || undefined,
    status: (params.status as "active" | "inactive") || undefined,
    search: params.search || undefined,
    sortBy: params.sortBy || undefined,
    sortOrder: (params.sortOrder as "asc" | "desc") || undefined,
  };

  const [resources, stats] = await Promise.all([
    getResources(listParams),
    getResourceStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Library"
        description="Manage aviation resources, FAA documents, and PDF manuals"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Resources"
          value={formatNumber(stats.total)}
          icon={FileText}
        />
        <StatCard
          title="Active"
          value={formatNumber(stats.active)}
          icon={Eye}
        />
        <StatCard
          title="Inactive"
          value={formatNumber(stats.inactive)}
          icon={EyeOff}
        />
        <StatCard
          title="Featured"
          value={formatNumber(stats.featured)}
          icon={Star}
        />
      </div>

      <ResourceDataTable data={resources} adminRole={adminRole} />
    </div>
  );
}
