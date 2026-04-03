"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  SubscriptionEvent,
  SubscriptionStats,
  SubscriptionTrendPoint,
} from "@/types/subscription";

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  // Get all subscription events
  const { data: events } = await supabase
    .from("subscription_events")
    .select("user_id, rc_event_type, expiration_at, is_trial_period, price_usd")
    .order("created_at", { ascending: false });

  if (!events || events.length === 0) {
    return { totalActive: 0, totalTrial: 0, totalChurned: 0, mrr: 0 };
  }

  // Get latest event per user
  const latestPerUser = new Map<
    string,
    (typeof events)[0]
  >();
  for (const event of events) {
    if (!latestPerUser.has(event.user_id)) {
      latestPerUser.set(event.user_id, event);
    }
  }

  let totalActive = 0;
  let totalTrial = 0;
  let totalChurned = 0;
  let mrr = 0;

  for (const [, event] of latestPerUser) {
    const isActive =
      event.expiration_at && new Date(event.expiration_at) > new Date(now);
    const isCancellation =
      event.rc_event_type === "CANCELLATION" ||
      event.rc_event_type === "EXPIRATION";

    if (isActive && !isCancellation) {
      if (event.is_trial_period) {
        totalTrial++;
      } else {
        totalActive++;
        mrr += event.price_usd ?? 0;
      }
    } else if (isCancellation) {
      totalChurned++;
    }
  }

  return { totalActive, totalTrial, totalChurned, mrr };
}

export async function getSubscriptionTrends(
  days: number
): Promise<SubscriptionTrendPoint[]> {
  const supabase = createServiceRoleClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: events } = await supabase
    .from("subscription_events")
    .select("rc_event_type, created_at")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (!events || events.length === 0) return [];

  // Group by date
  const dateMap = new Map<
    string,
    { newSubs: number; cancellations: number }
  >();

  for (const event of events) {
    const date = new Date(event.created_at).toISOString().split("T")[0];
    const entry = dateMap.get(date) ?? { newSubs: 0, cancellations: 0 };

    if (
      event.rc_event_type === "INITIAL_PURCHASE" ||
      event.rc_event_type === "RENEWAL" ||
      event.rc_event_type === "UNCANCELLATION"
    ) {
      entry.newSubs++;
    } else if (
      event.rc_event_type === "CANCELLATION" ||
      event.rc_event_type === "EXPIRATION"
    ) {
      entry.cancellations++;
    }

    dateMap.set(date, entry);
  }

  // Fill in missing dates
  const result: SubscriptionTrendPoint[] = [];
  const current = new Date(startDate);
  const today = new Date();

  while (current <= today) {
    const dateStr = current.toISOString().split("T")[0];
    const entry = dateMap.get(dateStr) ?? { newSubs: 0, cancellations: 0 };
    result.push({
      date: dateStr,
      newSubs: entry.newSubs,
      cancellations: entry.cancellations,
      netChange: entry.newSubs - entry.cancellations,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export async function getUserSubscriptionHistory(
  userId: string
): Promise<SubscriptionEvent[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("subscription_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to get subscription history: ${error.message}`);

  return (data ?? []) as SubscriptionEvent[];
}
