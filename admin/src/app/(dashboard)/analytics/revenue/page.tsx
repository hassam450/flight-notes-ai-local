import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MrrTrendChart } from "@/components/analytics/mrr-trend-chart";
import { RevenueByPlanChart } from "@/components/analytics/revenue-by-plan-chart";
import { formatCurrency } from "@/lib/format";
import { getMrrTrend, getRevenueByPlan } from "@/lib/actions/analytics";
import { DollarSign, TrendingUp } from "lucide-react";

export default async function RevenuePage() {
  const [mrrResult, planResult] = await Promise.allSettled([
    getMrrTrend(),
    getRevenueByPlan(),
  ]);

  const mrrData =
    mrrResult.status === "fulfilled" ? mrrResult.value : null;
  const planData =
    planResult.status === "fulfilled" ? planResult.value : null;

  const mrrError =
    mrrResult.status === "rejected"
      ? (mrrResult.reason as Error).message
      : null;
  const planError =
    planResult.status === "rejected"
      ? (planResult.reason as Error).message
      : null;

  if (!mrrData && !planData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Revenue Dashboard"
          description="MRR trends and revenue breakdown by subscription plan."
        />
        <Card>
          <CardHeader>
            <CardTitle>Revenue setup required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{mrrError ?? planError}</p>
            <p>
              Apply{" "}
              <code>scripts/task-admin-5.4-revenue-dashboard.sql</code> in
              Supabase, then reload this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Dashboard"
        description="MRR trends and revenue breakdown by subscription plan."
      />

      {mrrData && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Current MRR"
            value={formatCurrency(mrrData.currentMrr)}
            icon={DollarSign}
            footer={`Based on ${mrrData.windowDays}-day window`}
          />
          <StatCard
            title="MRR Growth"
            value={`${mrrData.mrrGrowthPct >= 0 ? "+" : ""}${mrrData.mrrGrowthPct}%`}
            icon={TrendingUp}
            trend={{
              value: mrrData.mrrGrowthPct,
              label: `over ${mrrData.windowDays} days`,
            }}
            footer="Change over selected period"
          />
        </div>
      )}

      {mrrData ? (
        <MrrTrendChart data={mrrData} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>MRR trend unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{mrrError}</p>
          </CardContent>
        </Card>
      )}

      {planData ? (
        <RevenueByPlanChart data={planData} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by plan unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{planError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
