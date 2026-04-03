"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RevenueByPlanData } from "@/types/analytics";

interface RevenueByPlanChartProps {
  data: RevenueByPlanData;
}

const COLORS = [
  "hsl(263, 70%, 58%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(199, 89%, 48%)",
  "hsl(330, 81%, 60%)",
];

function formatProductId(productId: string): string {
  return productId
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RevenueByPlanChart({ data }: RevenueByPlanChartProps) {
  if (data.plans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            No plan data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.plans.map((plan) => ({
    name: formatProductId(plan.productId),
    value: plan.mrr,
    count: plan.activeCount,
    percentage: plan.percentage,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Revenue by Plan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total MRR: <span className="font-medium text-foreground">${data.totalMrr.toFixed(2)}</span>
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={130}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(263, 32%, 13%)",
                border: "1px solid hsl(215, 19%, 27%)",
                borderRadius: "8px",
                color: "hsl(210, 20%, 98%)",
              }}
              formatter={(value, name) => [
                `$${Number(value).toFixed(2)}`,
                String(name),
              ]}
            />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: "hsl(210, 20%, 98%)" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {data.plans.map((plan, i) => (
            <div
              key={plan.productId}
              className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm font-medium">
                  {formatProductId(plan.productId)}
                </span>
              </div>
              <div className="text-right text-sm">
                <span className="font-medium">${plan.mrr.toFixed(2)}</span>
                <span className="ml-2 text-muted-foreground">
                  {plan.activeCount} subs &middot; {plan.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
