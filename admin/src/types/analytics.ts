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
