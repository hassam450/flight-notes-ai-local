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
import type { TaskResponseTime } from "@/types/ai";

const taskLabels: Record<string, string> = {
  transcription: "Transcription",
  summary: "Summary",
  flashcards: "Flashcards",
};

interface ResponseTimeChartProps {
  data: TaskResponseTime[];
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  const chartData = data.map((d) => ({
    name: taskLabels[d.task] ?? d.task,
    avgSeconds: Math.round(d.avgDurationMs / 100) / 10,
    jobCount: d.jobCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Avg Response Time by Task Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No response time data available yet.
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
                unit="s"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(263, 32%, 13%)",
                  border: "1px solid hsl(215, 19%, 27%)",
                  borderRadius: "8px",
                  color: "hsl(210, 20%, 98%)",
                }}
                formatter={(value) => [`${value}s`, "Avg Duration"]}
              />
              <Bar
                dataKey="avgSeconds"
                name="Avg Duration"
                fill="hsl(142, 71%, 45%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
