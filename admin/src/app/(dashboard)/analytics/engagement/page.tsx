import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionDurationChart } from "@/components/analytics/session-duration-chart";
import { RetentionHeatmap } from "@/components/analytics/retention-heatmap";
import {
  getSessionDurationDistribution,
  getRetentionCohorts,
} from "@/lib/actions/analytics";

export default async function EngagementPage() {
  const [durationResult, retentionResult] = await Promise.allSettled([
    getSessionDurationDistribution(),
    getRetentionCohorts(),
  ]);

  const durationData =
    durationResult.status === "fulfilled" ? durationResult.value : null;
  const retentionData =
    retentionResult.status === "fulfilled" ? retentionResult.value : null;

  const durationError =
    durationResult.status === "rejected"
      ? (durationResult.reason as Error).message
      : null;
  const retentionError =
    retentionResult.status === "rejected"
      ? (retentionResult.reason as Error).message
      : null;

  if (!durationData && !retentionData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Engagement Metrics"
          description="Session duration distribution and user retention cohorts."
        />
        <Card>
          <CardHeader>
            <CardTitle>Engagement setup required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{durationError ?? retentionError}</p>
            <p>
              Apply{" "}
              <code>scripts/task-admin-5.3-engagement-metrics.sql</code> in
              Supabase, then reload this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engagement Metrics"
        description="Session duration distribution and user retention cohorts."
      />

      {durationData ? (
        <SessionDurationChart data={durationData} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Session duration unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{durationError}</p>
          </CardContent>
        </Card>
      )}

      {retentionData ? (
        <RetentionHeatmap data={retentionData} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Retention cohorts unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{retentionError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
