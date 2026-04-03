"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  AdminUserView,
  UserActivitySummary,
  UserListParams,
  PaginatedResult,
} from "@/types/user";
import { SubscriptionTier } from "@/types/subscription";

export async function getUsers(
  params: UserListParams
): Promise<PaginatedResult<AdminUserView>> {
  const supabase = createServiceRoleClient();

  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers({
    page: params.page,
    perPage: params.pageSize,
  });

  if (error) throw new Error(`Failed to list users: ${error.message}`);

  // Get all user IDs for batch queries
  const userIds = users.map((u) => u.id);

  // Batch query counts from related tables
  const [notesResult, sessionsResult, subsResult] = await Promise.all([
    supabase
      .from("notes")
      .select("user_id", { count: "exact", head: false })
      .in("user_id", userIds),
    supabase
      .from("learning_sessions")
      .select("user_id", { count: "exact", head: false })
      .in("user_id", userIds),
    supabase
      .from("subscription_events")
      .select("user_id, rc_event_type, expiration_at, is_trial_period")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
  ]);

  // Build count maps
  const notesCounts: Record<string, number> = {};
  (notesResult.data ?? []).forEach((r) => {
    notesCounts[r.user_id] = (notesCounts[r.user_id] ?? 0) + 1;
  });

  const sessionsCounts: Record<string, number> = {};
  (sessionsResult.data ?? []).forEach((r) => {
    sessionsCounts[r.user_id] = (sessionsCounts[r.user_id] ?? 0) + 1;
  });

  // Derive subscription tier from latest event per user
  const subTiers: Record<string, SubscriptionTier> = {};
  const seenUsers = new Set<string>();
  (subsResult.data ?? []).forEach((e) => {
    if (seenUsers.has(e.user_id)) return;
    seenUsers.add(e.user_id);
    const isActive =
      e.expiration_at && new Date(e.expiration_at) > new Date();
    const isCancellation =
      e.rc_event_type === "CANCELLATION" ||
      e.rc_event_type === "EXPIRATION";
    subTiers[e.user_id] =
      isActive && !isCancellation
        ? SubscriptionTier.Premium
        : SubscriptionTier.Free;
  });

  // Filter by search
  let filteredUsers = users;
  if (params.search) {
    const search = params.search.toLowerCase();
    filteredUsers = filteredUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes(search) ||
        (u.user_metadata?.full_name as string)
          ?.toLowerCase()
          .includes(search)
    );
  }

  // Filter by provider
  if (params.provider) {
    filteredUsers = filteredUsers.filter(
      (u) => u.app_metadata?.provider === params.provider
    );
  }

  // Map to AdminUserView
  const mapped: AdminUserView[] = filteredUsers.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string) ?? null,
    avatar_url: (u.user_metadata?.avatar_url as string) ?? null,
    provider: (u.app_metadata?.provider as string) ?? "email",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    is_banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
    notes_count: notesCounts[u.id] ?? 0,
    sessions_count: sessionsCounts[u.id] ?? 0,
    subscription_tier: subTiers[u.id] ?? SubscriptionTier.Free,
  }));

  // Sort
  if (params.sortBy) {
    const order = params.sortOrder === "desc" ? -1 : 1;
    mapped.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[params.sortBy!];
      const bVal = (b as unknown as Record<string, unknown>)[params.sortBy!];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * order;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * order;
      }
      return 0;
    });
  }

  // Since listUsers gives us paginated data, total comes from it
  // But client-side filtering changes the count
  const total = filteredUsers.length;

  return {
    data: mapped,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getUserById(
  id: string
): Promise<{ user: AdminUserView; activity: UserActivitySummary } | null> {
  const supabase = createServiceRoleClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.admin.getUserById(id);

  if (error || !user) return null;

  const [notesResult, sessionsResult, threadsResult, recordingsResult] =
    await Promise.all([
      supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id),
      supabase
        .from("learning_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id),
      supabase
        .from("chat_threads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id),
      supabase
        .from("recordings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id),
    ]);

  // Get latest subscription event
  const { data: latestSub } = await supabase
    .from("subscription_events")
    .select("rc_event_type, expiration_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let tier = SubscriptionTier.Free;
  if (latestSub) {
    const isActive =
      latestSub.expiration_at &&
      new Date(latestSub.expiration_at) > new Date();
    const isCancellation =
      latestSub.rc_event_type === "CANCELLATION" ||
      latestSub.rc_event_type === "EXPIRATION";
    if (isActive && !isCancellation) tier = SubscriptionTier.Premium;
  }

  const adminUser: AdminUserView = {
    id: user.id,
    email: user.email ?? "",
    full_name: (user.user_metadata?.full_name as string) ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    provider: (user.app_metadata?.provider as string) ?? "email",
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at ?? null,
    is_banned: !!user.banned_until && new Date(user.banned_until) > new Date(),
    notes_count: notesResult.count ?? 0,
    sessions_count: sessionsResult.count ?? 0,
    subscription_tier: tier,
  };

  return {
    user: adminUser,
    activity: {
      notes_count: notesResult.count ?? 0,
      sessions_count: sessionsResult.count ?? 0,
      chat_threads_count: threadsResult.count ?? 0,
      recordings_count: recordingsResult.count ?? 0,
    },
  };
}

export async function suspendUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: "876000h",
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function reactivateUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: "none",
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getAllUsersForExport(): Promise<AdminUserView[]> {
  const supabase = createServiceRoleClient();

  // Fetch all users (paginate through if needed)
  const allUsers: AdminUserView[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) throw new Error(`Failed to export users: ${error.message}`);
    if (users.length === 0) break;

    const userIds = users.map((u) => u.id);

    const [notesResult, sessionsResult] = await Promise.all([
      supabase
        .from("notes")
        .select("user_id")
        .in("user_id", userIds),
      supabase
        .from("learning_sessions")
        .select("user_id")
        .in("user_id", userIds),
    ]);

    const notesCounts: Record<string, number> = {};
    (notesResult.data ?? []).forEach((r) => {
      notesCounts[r.user_id] = (notesCounts[r.user_id] ?? 0) + 1;
    });

    const sessionsCounts: Record<string, number> = {};
    (sessionsResult.data ?? []).forEach((r) => {
      sessionsCounts[r.user_id] = (sessionsCounts[r.user_id] ?? 0) + 1;
    });

    for (const u of users) {
      allUsers.push({
        id: u.id,
        email: u.email ?? "",
        full_name: (u.user_metadata?.full_name as string) ?? null,
        avatar_url: (u.user_metadata?.avatar_url as string) ?? null,
        provider: (u.app_metadata?.provider as string) ?? "email",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        is_banned:
          !!u.banned_until && new Date(u.banned_until) > new Date(),
        notes_count: notesCounts[u.id] ?? 0,
        sessions_count: sessionsCounts[u.id] ?? 0,
        subscription_tier: SubscriptionTier.Free,
      });
    }

    if (users.length < perPage) break;
    page++;
  }

  return allUsers;
}
