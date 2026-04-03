import { headers } from "next/headers";
import { getAiJobs, getAiJobStats } from "@/lib/actions/ai-jobs";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { JobQueueTable } from "@/components/ai-pipeline/job-queue-table";
import { formatNumber } from "@/lib/format";
import type { AiJobListParams, AiJobStatus, AiTask } from "@/types/ai";
import {
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function JobQueuePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const adminRole = headersList.get("x-admin-role") ?? "viewer";

  const listParams: AiJobListParams = {
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 25,
    status: (params.status as AiJobStatus) || undefined,
    task: (params.task as AiTask) || undefined,
    search: params.search || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    sortBy: params.sortBy || undefined,
    sortOrder: (params.sortOrder as "asc" | "desc") || undefined,
  };

  const [jobs, stats] = await Promise.all([
    getAiJobs(listParams),
    getAiJobStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Queue"
        description="Monitor AI processing jobs in real-time"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Jobs"
          value={formatNumber(stats.total)}
          icon={Cpu}
        />
        <StatCard
          title="Queued"
          value={formatNumber(stats.queued)}
          icon={Clock}
        />
        <StatCard
          title="Processing"
          value={formatNumber(stats.processing)}
          icon={Loader2}
        />
        <StatCard
          title="Completed"
          value={formatNumber(stats.completed)}
          icon={CheckCircle2}
        />
        <StatCard
          title="Failed (24h)"
          value={formatNumber(stats.failed24h)}
          icon={XCircle}
        />
      </div>

      <JobQueueTable data={jobs} adminRole={adminRole} />
    </div>
  );
}
