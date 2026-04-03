import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event as Record<string, unknown> | undefined;
  if (!event) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  const appUserId = event.app_user_id as string | undefined;
  const eventType = event.type as string | undefined;
  const eventId = event.id as string | undefined;
  const productId = event.product_id as string | undefined;

  if (!appUserId || !eventType || !productId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert event (rc_event_id unique constraint handles idempotency)
  const { error } = await supabase.from("subscription_events").insert({
    user_id: appUserId,
    rc_event_type: eventType,
    rc_event_id: eventId ?? null,
    product_id: productId,
    store: (event.store as string) ?? null,
    environment: (event.environment as string) ?? null,
    purchased_at: (event.purchased_at_ms as number)
      ? new Date(event.purchased_at_ms as number).toISOString()
      : null,
    expiration_at: (event.expiration_at_ms as number)
      ? new Date(event.expiration_at_ms as number).toISOString()
      : null,
    is_trial_period: (event.period_type as string) === "TRIAL",
    currency: (event.currency as string) ?? null,
    price_usd: (event.price as number) ?? null,
    raw_payload: body,
  });

  if (error) {
    // Duplicate rc_event_id — idempotent success
    if (error.code === "23505") {
      return NextResponse.json({ status: "duplicate", event_id: eventId });
    }
    console.error("Webhook insert error:", error);
    return NextResponse.json(
      { error: "Failed to process event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok", event_id: eventId });
}
