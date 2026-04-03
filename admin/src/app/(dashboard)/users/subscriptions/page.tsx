import { Suspense } from "react";
import {
  getSubscriptionStats,
  getSubscriptionTrends,
} from "@/lib/actions/subscriptions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SubscriptionTrendChart } from "@/components/subscriptions/subscription-trend-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { Users, UserCheck, UserX, DollarSign } from "lucide-react";

export default async function SubscriptionsPage() {
  const [stats, trends] = await Promise.all([
    getSubscriptionStats(),
    getSubscriptionTrends(90),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Overview of subscription activity and revenue"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Subscribers" value={stats.totalActive} icon={Users} />
        <StatCard title="Trial Users" value={stats.totalTrial} icon={UserCheck} />
        <StatCard title="Churned" value={stats.totalChurned} icon={UserX} />
        <StatCard
          title="MRR"
          value={formatCurrency(stats.mrr)}
          icon={DollarSign}
        />
      </div>

      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
        <SubscriptionTrendChart data={trends} />
      </Suspense>
    </div>
  );
}
