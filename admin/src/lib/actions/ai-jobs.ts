"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  AiJobRow,
  AiJobListParams,
  AiJobStats,
} from "@/types/ai";
import type { PaginatedResult } from "@/types/user";

export async function getAiJobs(
  params: AiJobListParams
): Promise<PaginatedResult<AiJobRow>> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("notes_ai_jobs")
    .select("*", { count: "exact" });

  // Filters
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.task) {
    query = query.eq("task", params.task);
  }
  if (params.dateFrom) {
    query = query.gte("created_at", params.dateFrom);
  }
  if (params.dateTo) {
    query = query.lte("created_at", params.dateTo);
  }

  // Sort
  const sortBy = params.sortBy ?? "created_at";
  const sortOrder = params.sortOrder ?? "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Pagination
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  query = query.range(from, to);

  const { data: jobs, error, count } = await query;

  if (error) throw new Error(`Failed to list AI jobs: ${error.message}`);

  const total = count ?? 0;
  let rows = (jobs ?? []) as AiJobRow[];

  // Enrich with user emails
  const userIds = [...new Set(rows.map((j) => j.user_id))];
  if (userIds.length > 0) {
    const emailMap: Record<string, string> = {};
    // Batch fetch users from auth
    for (const uid of userIds) {
      const { data: { user } } = await supabase.auth.admin.getUserById(uid);
      if (user?.email) emailMap[uid] = user.email;
    }
    rows = rows.map((j) => ({ ...j, user_email: emailMap[j.user_id] ?? "" }));
  }

  // Client-side search (by job ID or user email)
  if (params.search) {
    const search = params.search.toLowerCase();
    rows = rows.filter(
      (j) =>
        j.id.toLowerCase().includes(search) ||
        (j.user_email ?? "").toLowerCase().includes(search)
    );
  }

  return {
    data: rows,
    total: params.search ? rows.length : total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(
      1,
      Math.ceil((params.search ? rows.length : total) / params.pageSize)
    ),
  };
}

export async function getAiJobStats(): Promise<AiJobStats> {
  const supabase = createServiceRoleClient();

  const { data: allJobs, error } = await supabase
    .from("notes_ai_jobs")
    .select("status, duration_ms, created_at");

  if (error) throw new Error(`Failed to get AI job stats: ${error.message}`);

  const jobs = allJobs ?? [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let total = 0;
  let queued = 0;
  let processing = 0;
  let completed = 0;
  let failed = 0;
  let failed24h = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const job of jobs) {
    total++;
    switch (job.status) {
      case "queued":
        queued++;
        break;
      case "processing":
        processing++;
        break;
      case "completed":
        completed++;
        break;
      case "failed":
        failed++;
        if (new Date(job.created_at) >= oneDayAgo) failed24h++;
        break;
    }
    if (job.duration_ms != null) {
      durationSum += job.duration_ms;
      durationCount++;
    }
  }

  return {
    total,
    queued,
    processing,
    completed,
    failed,
    failed24h,
    avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
  };
}

export async function getAiJobById(
  id: string
): Promise<(AiJobRow & { user_email: string }) | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("notes_ai_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const job = data as AiJobRow;

  // Get user email
  const { data: { user } } = await supabase.auth.admin.getUserById(job.user_id);

  return { ...job, user_email: user?.email ?? "" };
}

export async function retryFailedJob(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("notes_ai_jobs")
    .update({
      status: "queued",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "failed");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function bulkRetryFailedJobs(
  ids: string[]
): Promise<{ success: boolean; retried: number; error?: string }> {
  const supabase = createServiceRoleClient();

  const { error, count } = await supabase
    .from("notes_ai_jobs")
    .update({
      status: "queued",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .eq("status", "failed");

  if (error) return { success: false, retried: 0, error: error.message };
  return { success: true, retried: count ?? ids.length };
}
