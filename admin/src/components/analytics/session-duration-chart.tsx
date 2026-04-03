"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionDurationData } from "@/types/analytics";

interface SessionDurationChartProps {
  data: SessionDurationData;
}

const SOURCE_LABELS: Record<string, string> = {
  learning_session: "Quiz / Oral Exam",
  recording: "Recording",
  ai_job: "AI Processing",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function SessionDurationChart({ data }: SessionDurationChartProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Session Duration Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.distribution.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No session data available yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={data.distribution}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(215, 19%, 27%)"
                />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 12, fill: "hsl(215, 16%, 57%)" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(215, 16%, 57%)" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(263, 32%, 13%)",
                    border: "1px solid hsl(215, 19%, 27%)",
                    borderRadius: "8px",
                    color: "hsl(210, 20%, 98%)",
                  }}
                  formatter={(value, name) => {
                    if (name === "count") return [Number(value), "Sessions"];
                    return [Number(value), String(name)];
                  }}
                  labelFormatter={(label) => `Duration: ${label}`}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(263, 70%, 58%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {data.bySource.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Duration by Activity Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.bySource.map((source) => (
                <div
                  key={source.source}
                  className="rounded-lg border border-border bg-muted/30 p-4"
                >
                  <p className="text-sm font-medium">
                    {SOURCE_LABELS[source.source] ?? source.source}
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatDuration(source.avgSeconds)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    avg &middot; {formatDuration(source.medianSeconds)} median
                    &middot; {source.count} sessions
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
