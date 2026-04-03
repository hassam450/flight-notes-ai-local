"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TokenUsagePoint } from "@/types/ai";

interface TokenUsageChartProps {
  data: TokenUsagePoint[];
}

export function TokenUsageChart({ data }: TokenUsageChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Token Consumption</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No usage data available yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(263, 70%, 58%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(263, 70%, 58%)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(199, 89%, 48%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(199, 89%, 48%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(215, 19%, 27%)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "hsl(215, 16%, 57%)" }}
                tickFormatter={(value: string) => {
                  const d = new Date(value);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
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
                labelFormatter={(label) =>
                  new Date(String(label)).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                }
                formatter={(value) => Number(value).toLocaleString()}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="inputTokens"
                name="Input Tokens"
                stroke="hsl(263, 70%, 58%)"
                fillOpacity={1}
                fill="url(#colorInput)"
              />
              <Area
                type="monotone"
                dataKey="outputTokens"
                name="Output Tokens"
                stroke="hsl(199, 89%, 48%)"
                fillOpacity={1}
                fill="url(#colorOutput)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
