export type AnalyticsSeriesPoint = {
  date: string;
  value: number;
};

export type AnalyticsOverviewTrendKey =
  | "total_users"
  | "dau"
  | "wau"
  | "mau"
  | "total_notes"
  | "conversion_rate";

export type AnalyticsOverviewRpcResult = {
  generated_at: string;
  window_days: number;
  total_users: number;
  dau: number;
  wau: number;
  mau: number;
  total_notes: number;
  paid_converted_users: number;
  conversion_rate: number;
  trends: Partial<Record<AnalyticsOverviewTrendKey, AnalyticsSeriesPoint[]>>;
};

export type AnalyticsOverviewMetrics = {
  generatedAt: string;
  windowDays: number;
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  totalNotes: number;
  paidConvertedUsers: number;
  conversionRate: number;
  trends: Record<AnalyticsOverviewTrendKey, AnalyticsSeriesPoint[]>;
};

// 5.3 Engagement Metrics

export type SessionDurationBucket = {
  bucket: string;
  count: number;
  percentage: number;
};

export type SessionSourceBreakdown = {
  source: string;
  avgSeconds: number;
  medianSeconds: number;
  count: number;
};

export type SessionDurationData = {
  generatedAt: string;
  windowDays: number;
  distribution: SessionDurationBucket[];
  bySource: SessionSourceBreakdown[];
  dailyAvgDuration: AnalyticsSeriesPoint[];
};

export type RetentionCohort = {
  cohortWeek: string;
  cohortSize: number;
  day1Pct: number;
  day7Pct: number;
  day30Pct: number;
};

export type RetentionCohortData = {
  generatedAt: string;
  cohortWeeks: number;
  cohorts: RetentionCohort[];
};

// 5.4 Revenue Dashboard

export type MrrTrendData = {
  generatedAt: string;
  windowDays: number;
  currentMrr: number;
  mrrGrowthPct: number;
  trend: AnalyticsSeriesPoint[];
};

export type RevenuePlanBreakdown = {
  productId: string;
  activeCount: number;
  mrr: number;
  percentage: number;
};

export type RevenueByPlanData = {
  generatedAt: string;
  plans: RevenuePlanBreakdown[];
  totalMrr: number;
};
