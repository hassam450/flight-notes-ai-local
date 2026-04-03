import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { getAnalyticsOverview } from "@/lib/actions/analytics";
import type { AnalyticsSeriesPoint } from "@/types/analytics";
import {
  Activity,
  CalendarDays,
  CalendarRange,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";

function getSeriesValues(points: AnalyticsSeriesPoint[]): number[] {
  return points.map((point) => point.value);
}

function getTrendValue(points: AnalyticsSeriesPoint[]): number {
  if (points.length < 2) return 0;

  const current = points.at(-1)?.value ?? 0;
  const previous = points.at(-2)?.value ?? 0;

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export default async function AnalyticsPage() {
  const result = await getAnalyticsOverview()
    .then((overview) => ({ overview, error: null }))
    .catch((error: unknown) => ({
      overview: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load analytics overview.",
    }));

  if (!result.overview) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics Overview"
          description="Top-level product metrics across user growth, engagement, notes, and conversion."
        />

        <Card>
          <CardHeader>
            <CardTitle>Analytics setup required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{result.error}</p>
            <p>
              Apply <code>scripts/task-admin-5.1-analytics-overview.sql</code> in
              Supabase, then reload this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overview = result.overview;
  const trendLabel = "vs prior point";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Overview"
        description="Top-level product metrics across user growth, engagement, notes, and conversion."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Users"
          value={formatNumber(overview.totalUsers)}
          icon={Users}
          trend={{
            value: getTrendValue(overview.trends.total_users),
            label: trendLabel,
          }}
          sparkline={getSeriesValues(overview.trends.total_users)}
          footer={`${overview.windowDays}-day cumulative growth`}
        />
        <StatCard
          title="DAU"
          value={formatNumber(overview.dau)}
          icon={Activity}
          trend={{
            value: getTrendValue(overview.trends.dau),
            label: trendLabel,
          }}
          sparkline={getSeriesValues(overview.trends.dau)}
          footer="Distinct active users today"
        />
        <StatCard
          title="WAU"
          value={formatNumber(overview.wau)}
          icon={CalendarDays}
          trend={{
            value: getTrendValue(overview.trends.wau),
            label: trendLabel,
          }}
          sparkline={getSeriesValues(overview.trends.wau)}
          footer="Rolling 7-day active users"
        />
        <StatCard
          title="MAU"
          value={formatNumber(overview.mau)}
          icon={CalendarRange}
          trend={{
            value: getTrendValue(overview.trends.mau),
            label: trendLabel,
          }}
          sparkline={getSeriesValues(overview.trends.mau)}
          footer="Rolling 30-day active users"
        />
        <StatCard
          title="Total Notes"
          value={formatNumber(overview.totalNotes)}
          icon={FileText}
          trend={{
            value: getTrendValue(overview.trends.total_notes),
            label: trendLabel,
          }}
          sparkline={getSeriesValues(overview.trends.total_notes)}
          footer="Cumulative uploaded and recorded notes"
        />
        <StatCard
          title="Paid Conversion"
          value={`${overview.conversionRate.toFixed(1)}%`}
          icon={TrendingUp}
          trend={{
            value: getTrendValue(overview.trends.conversion_rate),
            label: trendLabel,
          }}
          sparkline={getSeriesValues(overview.trends.conversion_rate)}
          footer={`${formatNumber(overview.paidConvertedUsers)} users have converted`}
        />
      </div>
    </div>
  );
}
