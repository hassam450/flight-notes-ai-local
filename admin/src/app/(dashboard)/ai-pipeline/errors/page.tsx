import { headers } from "next/headers";
import { getAiJobs, getAiJobStats } from "@/lib/actions/ai-jobs";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorLogTable } from "@/components/ai-pipeline/error-log-table";
import { formatNumber } from "@/lib/format";
import type { AiJobListParams } from "@/types/ai";
import { AlertTriangle, XCircle } from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ErrorLogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const adminRole = headersList.get("x-admin-role") ?? "viewer";

  const listParams: AiJobListParams = {
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 25,
    status: "failed",
    task: undefined,
    search: params.search || undefined,
    sortBy: params.sortBy || "created_at",
    sortOrder: (params.sortOrder as "asc" | "desc") || "desc",
  };

  const [errors, stats] = await Promise.all([
    getAiJobs(listParams),
    getAiJobStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Error Log"
        description="Track and retry failed AI processing jobs"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Failed (24h)"
          value={formatNumber(stats.failed24h)}
          icon={AlertTriangle}
        />
        <StatCard
          title="Total Failed"
          value={formatNumber(stats.failed)}
          icon={XCircle}
        />
        <StatCard
          title="Failure Rate"
          value={
            stats.total > 0
              ? `${((stats.failed / stats.total) * 100).toFixed(1)}%`
              : "0%"
          }
          icon={AlertTriangle}
        />
      </div>

      <ErrorLogTable data={errors} adminRole={adminRole} />
    </div>
  );
}
