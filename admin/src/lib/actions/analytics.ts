"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  AnalyticsOverviewMetrics,
  AnalyticsOverviewRpcResult,
  AnalyticsOverviewTrendKey,
  AnalyticsSeriesPoint,
  MrrTrendData,
  RetentionCohort,
  RetentionCohortData,
  RevenueByPlanData,
  RevenuePlanBreakdown,
  SessionDurationBucket,
  SessionDurationData,
  SessionSourceBreakdown,
} from "@/types/analytics";

const OVERVIEW_TREND_KEYS: AnalyticsOverviewTrendKey[] = [
  "total_users",
  "dau",
  "wau",
  "mau",
  "total_notes",
  "conversion_rate",
];

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toSeries(value: unknown): AnalyticsSeriesPoint[] {
  if (!Array.isArray(value)) return [];

  return value.map((point) => {
    const item = point as Record<string, unknown>;
    return {
      date: typeof item.date === "string" ? item.date : "",
      value: toNumber(item.value),
    };
  });
}

export async function getAnalyticsOverview(
  days = 28
): Promise<AnalyticsOverviewMetrics> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_get_overview_metrics", {
    metric_days: days,
  });

  if (error) {
    if (error.message.includes("admin_get_overview_metrics")) {
      throw new Error(
        "Analytics RPC is missing. Run scripts/task-admin-5.1-analytics-overview.sql in Supabase."
      );
    }

    throw new Error(`Failed to load analytics overview: ${error.message}`);
  }

  const result = (data ?? {}) as Partial<AnalyticsOverviewRpcResult>;
  const rawTrends = (result.trends ?? {}) as Record<string, unknown>;

  const trends = OVERVIEW_TREND_KEYS.reduce<
    Record<AnalyticsOverviewTrendKey, AnalyticsSeriesPoint[]>
  >((acc, key) => {
    acc[key] = toSeries(rawTrends[key]);
    return acc;
  }, {} as Record<AnalyticsOverviewTrendKey, AnalyticsSeriesPoint[]>);

  return {
    generatedAt:
      typeof result.generated_at === "string"
        ? result.generated_at
        : new Date().toISOString(),
    windowDays: toNumber(result.window_days) || days,
    totalUsers: toNumber(result.total_users),
    dau: toNumber(result.dau),
    wau: toNumber(result.wau),
    mau: toNumber(result.mau),
    totalNotes: toNumber(result.total_notes),
    paidConvertedUsers: toNumber(result.paid_converted_users),
    conversionRate: toNumber(result.conversion_rate),
    trends,
  };
}

// --- 5.3 Engagement Metrics ---

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function getSessionDurationDistribution(
  days = 28
): Promise<SessionDurationData> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc(
    "admin_get_session_duration_distribution",
    { metric_days: days }
  );

  if (error) {
    if (error.message.includes("admin_get_session_duration_distribution")) {
      throw new Error(
        "Engagement RPC is missing. Run scripts/task-admin-5.3-engagement-metrics.sql in Supabase."
      );
    }
    throw new Error(
      `Failed to load session duration data: ${error.message}`
    );
  }

  const result = (data ?? {}) as Record<string, unknown>;

  const distribution: SessionDurationBucket[] = Array.isArray(
    result.distribution
  )
    ? result.distribution.map((d: Record<string, unknown>) => ({
        bucket: toString(d.bucket),
        count: toNumber(d.count),
        percentage: toNumber(d.percentage),
      }))
    : [];

  const bySource: SessionSourceBreakdown[] = Array.isArray(result.by_source)
    ? result.by_source.map((s: Record<string, unknown>) => ({
        source: toString(s.source),
        avgSeconds: toNumber(s.avg_seconds),
        medianSeconds: toNumber(s.median_seconds),
        count: toNumber(s.count),
      }))
    : [];

  return {
    generatedAt: toString(result.generated_at) || new Date().toISOString(),
    windowDays: toNumber(result.window_days) || days,
    distribution,
    bySource,
    dailyAvgDuration: toSeries(result.daily_avg_duration),
  };
}

export async function getRetentionCohorts(
  weeks = 12
): Promise<RetentionCohortData> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_get_retention_cohorts", {
    cohort_weeks: weeks,
  });

  if (error) {
    if (error.message.includes("admin_get_retention_cohorts")) {
      throw new Error(
        "Retention RPC is missing. Run scripts/task-admin-5.3-engagement-metrics.sql in Supabase."
      );
    }
    throw new Error(`Failed to load retention cohorts: ${error.message}`);
  }

  const result = (data ?? {}) as Record<string, unknown>;

  const cohorts: RetentionCohort[] = Array.isArray(result.cohorts)
    ? result.cohorts.map((c: Record<string, unknown>) => ({
        cohortWeek: toString(c.cohort_week),
        cohortSize: toNumber(c.cohort_size),
        day1Pct: toNumber(c.day_1_pct),
        day7Pct: toNumber(c.day_7_pct),
        day30Pct: toNumber(c.day_30_pct),
      }))
    : [];

  return {
    generatedAt: toString(result.generated_at) || new Date().toISOString(),
    cohortWeeks: toNumber(result.cohort_weeks) || weeks,
    cohorts,
  };
}

// --- 5.4 Revenue Dashboard ---

export async function getMrrTrend(days = 90): Promise<MrrTrendData> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_get_mrr_trend", {
    metric_days: days,
  });

  if (error) {
    if (error.message.includes("admin_get_mrr_trend")) {
      throw new Error(
        "MRR trend RPC is missing. Run scripts/task-admin-5.4-revenue-dashboard.sql in Supabase."
      );
    }
    throw new Error(`Failed to load MRR trend: ${error.message}`);
  }

  const result = (data ?? {}) as Record<string, unknown>;

  return {
    generatedAt: toString(result.generated_at) || new Date().toISOString(),
    windowDays: toNumber(result.window_days) || days,
    currentMrr: toNumber(result.current_mrr),
    mrrGrowthPct: toNumber(result.mrr_growth_pct),
    trend: toSeries(result.trend),
  };
}

export async function getRevenueByPlan(): Promise<RevenueByPlanData> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_get_revenue_by_plan");

  if (error) {
    if (error.message.includes("admin_get_revenue_by_plan")) {
      throw new Error(
        "Revenue by plan RPC is missing. Run scripts/task-admin-5.4-revenue-dashboard.sql in Supabase."
      );
    }
    throw new Error(`Failed to load revenue by plan: ${error.message}`);
  }

  const result = (data ?? {}) as Record<string, unknown>;

  const plans: RevenuePlanBreakdown[] = Array.isArray(result.plans)
    ? result.plans.map((p: Record<string, unknown>) => ({
        productId: toString(p.product_id),
        activeCount: toNumber(p.active_count),
        mrr: toNumber(p.mrr),
        percentage: toNumber(p.percentage),
      }))
    : [];

  return {
    generatedAt: toString(result.generated_at) || new Date().toISOString(),
    plans,
    totalMrr: toNumber(result.total_mrr),
  };
}
