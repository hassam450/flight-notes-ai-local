"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  AnalyticsOverviewMetrics,
  AnalyticsOverviewRpcResult,
  AnalyticsOverviewTrendKey,
  AnalyticsSeriesPoint,
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
