export enum SubscriptionTier {
  Free = "free",
  Premium = "premium",
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  isActive: boolean;
  expirationDate: string | null;
  managementUrl: string | null;
  loading: boolean;
  initialized: boolean;
}

export interface SubscriptionEvent {
  id: string;
  user_id: string;
  rc_event_type: string;
  rc_event_id: string | null;
  product_id: string;
  store: string | null;
  environment: string | null;
  purchased_at: string | null;
  expiration_at: string | null;
  is_trial_period: boolean;
  currency: string | null;
  price_usd: number | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
}

export interface SubscriptionStats {
  totalActive: number;
  totalTrial: number;
  totalChurned: number;
  mrr: number;
}

export interface SubscriptionTrendPoint {
  date: string;
  newSubs: number;
  cancellations: number;
  netChange: number;
}
