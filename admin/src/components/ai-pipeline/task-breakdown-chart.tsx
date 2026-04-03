"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskUsageBreakdown } from "@/types/ai";

const taskLabels: Record<string, string> = {
  transcription: "Transcription",
  summary: "Summary",
  flashcards: "Flashcards",
};

interface TaskBreakdownChartProps {
  data: TaskUsageBreakdown[];
}

export function TaskBreakdownChart({ data }: TaskBreakdownChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    name: taskLabels[d.task] ?? d.task,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Token Usage by Task Type</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No usage data available yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(215, 19%, 27%)"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(215, 16%, 57%)" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(215, 16%, 57%)" }}
                tickFormatter={(value: number) => {
                  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
                  return String(value);
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(263, 32%, 13%)",
                  border: "1px solid hsl(215, 19%, 27%)",
                  borderRadius: "8px",
                  color: "hsl(210, 20%, 98%)",
                }}
                formatter={(value) => Number(value).toLocaleString()}
              />
              <Legend />
              <Bar
                dataKey="inputTokens"
                name="Input Tokens"
                fill="hsl(263, 70%, 58%)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="outputTokens"
                name="Output Tokens"
                fill="hsl(199, 89%, 48%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
