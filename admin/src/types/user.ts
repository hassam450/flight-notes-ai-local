import { SubscriptionTier } from "./subscription";

export interface AdminUserView {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
  notes_count: number;
  sessions_count: number;
  subscription_tier: SubscriptionTier;
}

export interface UserActivitySummary {
  notes_count: number;
  sessions_count: number;
  chat_threads_count: number;
  recordings_count: number;
}

export interface UserListParams {
  page: number;
  pageSize: number;
  search?: string;
  provider?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
