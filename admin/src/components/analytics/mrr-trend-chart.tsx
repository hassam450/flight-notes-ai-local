"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MrrTrendData } from "@/types/analytics";

interface MrrTrendChartProps {
  data: MrrTrendData;
}

const ranges = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
] as const;

export function MrrTrendChart({ data }: MrrTrendChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") ?? "90";

  const filteredData = useMemo(() => {
    const days = Number(currentRange);
    if (days >= data.trend.length) return data.trend;
    return data.trend.slice(-days);
  }, [data.trend, currentRange]);

  function handleRangeChange(days: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", String(days));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">MRR Trend</CardTitle>
          <div className="flex gap-1">
            {ranges.map((r) => (
              <Button
                key={r.days}
                variant={
                  Number(currentRange) === r.days ? "default" : "outline"
                }
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => handleRangeChange(r.days)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No MRR data available yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(142, 71%, 45%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(142, 71%, 45%)"
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
                tickFormatter={(value: number) => `$${value}`}
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
                formatter={(value) => [
                  `$${Number(value).toFixed(2)}`,
                  "MRR",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="MRR"
                stroke="hsl(142, 71%, 45%)"
                fillOpacity={1}
                fill="url(#colorMrr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
