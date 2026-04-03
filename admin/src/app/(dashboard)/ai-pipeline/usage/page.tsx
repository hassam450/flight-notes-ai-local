import { Suspense } from "react";
import {
  getUsageStats,
  getTokenUsageByDay,
  getUsageByTaskType,
  getAvgResponseTimeByTask,
} from "@/lib/actions/ai-usage";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { TokenUsageChart } from "@/components/ai-pipeline/token-usage-chart";
import { TaskBreakdownChart } from "@/components/ai-pipeline/task-breakdown-chart";
import { ResponseTimeChart } from "@/components/ai-pipeline/response-time-chart";
import { UsageTimeRange } from "@/components/ai-pipeline/usage-time-range";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatCurrency } from "@/lib/format";
import { Coins, DollarSign, Clock, Hash } from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ApiUsagePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const days = Number(params.range) || 30;

  const [stats, tokenUsage, taskBreakdown, responseTimes] = await Promise.all([
    getUsageStats(days),
    getTokenUsageByDay(days),
    getUsageByTaskType(days),
    getAvgResponseTimeByTask(days),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="API Usage"
          description="OpenAI token consumption and cost tracking"
        />
        <UsageTimeRange />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tokens"
          value={formatNumber(stats.totalTokens)}
          icon={Coins}
        />
        <StatCard
          title="Estimated Cost"
          value={formatCurrency(stats.estimatedCost)}
          icon={DollarSign}
        />
        <StatCard
          title="Avg Response Time"
          value={
            stats.avgResponseMs != null
              ? `${(stats.avgResponseMs / 1000).toFixed(1)}s`
              : "—"
          }
          icon={Clock}
        />
        <StatCard
          title="Completed Jobs"
          value={formatNumber(stats.totalJobs)}
          icon={Hash}
        />
      </div>

      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
        <TokenUsageChart data={tokenUsage} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense
          fallback={<Skeleton className="h-[350px] w-full rounded-xl" />}
        >
          <TaskBreakdownChart data={taskBreakdown} />
        </Suspense>
        <Suspense
          fallback={<Skeleton className="h-[350px] w-full rounded-xl" />}
        >
          <ResponseTimeChart data={responseTimes} />
        </Suspense>
      </div>
    </div>
  );
}
