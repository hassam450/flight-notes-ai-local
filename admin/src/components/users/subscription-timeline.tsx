"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { SubscriptionEvent } from "@/types/subscription";
import { ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

interface SubscriptionTimelineProps {
  events: SubscriptionEvent[];
}

const eventColors: Record<string, string> = {
  INITIAL_PURCHASE: "default",
  RENEWAL: "default",
  CANCELLATION: "destructive",
  EXPIRATION: "destructive",
  UNCANCELLATION: "default",
  BILLING_ISSUE: "destructive",
  PRODUCT_CHANGE: "secondary",
};

function EventBadge({ type }: { type: string }) {
  const variant = (eventColors[type] ?? "secondary") as
    | "default"
    | "destructive"
    | "secondary"
    | "outline";
  return <Badge variant={variant}>{type.replace(/_/g, " ")}</Badge>;
}

function TimelineItem({ event }: { event: SubscriptionEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative border-l-2 border-border pl-6 pb-6 last:pb-0">
      <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <EventBadge type={event.rc_event_type} />
          <span className="text-xs text-muted-foreground">
            {formatDate(event.created_at)}
          </span>
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">Product:</span>{" "}
          {event.product_id}
        </p>
        {event.store && (
          <p className="text-sm">
            <span className="text-muted-foreground">Store:</span>{" "}
            {event.store}
          </p>
        )}
        {event.is_trial_period && (
          <Badge variant="outline" className="text-xs">
            Trial
          </Badge>
        )}
        {event.expiration_at && (
          <p className="text-xs text-muted-foreground">
            Expires: {formatDate(event.expiration_at)}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" /> Hide payload
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" /> Show payload
            </>
          )}
        </Button>
        {expanded && (
          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(event.raw_payload, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export function SubscriptionTimeline({
  events,
}: SubscriptionTimelineProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription History</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={CreditCard}
            message="No subscription events"
            description="This user has no RevenueCat subscription history."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subscription History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {events.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
