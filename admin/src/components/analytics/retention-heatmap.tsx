"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RetentionCohortData } from "@/types/analytics";

interface RetentionHeatmapProps {
  data: RetentionCohortData;
}

function formatCohortWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCellStyle(pct: number): React.CSSProperties {
  if (pct === 0) {
    return { backgroundColor: "hsl(215, 19%, 18%)" };
  }
  const opacity = Math.min(0.15 + (pct / 100) * 0.75, 0.9);
  return {
    backgroundColor: `hsla(142, 71%, 45%, ${opacity})`,
  };
}

export function RetentionHeatmap({ data }: RetentionHeatmapProps) {
  if (data.cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retention Cohorts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            No cohort data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Retention Cohorts</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Cohort
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Users
              </th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                Day 1
              </th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                Day 7
              </th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                Day 30
              </th>
            </tr>
          </thead>
          <tbody>
            {data.cohorts.map((cohort) => (
              <tr key={cohort.cohortWeek} className="border-b border-border/50">
                <td className="px-3 py-2 font-medium">
                  {formatCohortWeek(cohort.cohortWeek)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {cohort.cohortSize}
                </td>
                <td className="px-1 py-1 text-center">
                  <div
                    className="mx-auto rounded px-3 py-1.5 font-mono text-xs font-medium"
                    style={getCellStyle(cohort.day1Pct)}
                  >
                    {cohort.day1Pct}%
                  </div>
                </td>
                <td className="px-1 py-1 text-center">
                  <div
                    className="mx-auto rounded px-3 py-1.5 font-mono text-xs font-medium"
                    style={getCellStyle(cohort.day7Pct)}
                  >
                    {cohort.day7Pct}%
                  </div>
                </td>
                <td className="px-1 py-1 text-center">
                  <div
                    className="mx-auto rounded px-3 py-1.5 font-mono text-xs font-medium"
                    style={getCellStyle(cohort.day30Pct)}
                  >
                    {cohort.day30Pct}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
