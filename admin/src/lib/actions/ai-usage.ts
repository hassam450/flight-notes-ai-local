"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type {
  AiTask,
  TokenUsagePoint,
  TaskUsageBreakdown,
  TaskResponseTime,
  UsageStats,
} from "@/types/ai";

// Approximate cost per 1M tokens (USD) by model family
const COST_PER_1M_INPUT: Record<string, number> = {
  "gpt-4o-mini-transcribe": 6.0,
  "gpt-4.1-mini": 0.4,
  default: 0.5,
};
const COST_PER_1M_OUTPUT: Record<string, number> = {
  "gpt-4o-mini-transcribe": 6.0,
  "gpt-4.1-mini": 1.6,
  default: 1.5,
};

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model?: string | null
): number {
  const inputRate = COST_PER_1M_INPUT[model ?? ""] ?? COST_PER_1M_INPUT.default;
  const outputRate = COST_PER_1M_OUTPUT[model ?? ""] ?? COST_PER_1M_OUTPUT.default;
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;
}

/** Extract token counts from dedicated columns, falling back to result_payload.tokenUsage */
function extractTokens(job: {
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
  result_payload: Record<string, unknown> | null;
}): { input: number; output: number; model: string | null } {
  if (job.input_tokens != null || job.output_tokens != null) {
    return {
      input: job.input_tokens ?? 0,
      output: job.output_tokens ?? 0,
      model: job.model,
    };
  }
  // Fallback: result_payload.tokenUsage for existing jobs without dedicated columns
  const payload = job.result_payload;
  const tokenUsage = payload?.tokenUsage as
    | { inputTokens?: number; outputTokens?: number }
    | undefined;
  const model = (payload?.model as string) ?? job.model;
  return {
    input: tokenUsage?.inputTokens ?? 0,
    output: tokenUsage?.outputTokens ?? 0,
    model,
  };
}

export async function getUsageStats(days: number): Promise<UsageStats> {
  const supabase = createServiceRoleClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("notes_ai_jobs")
    .select("input_tokens, output_tokens, duration_ms, model, result_payload")
    .eq("status", "completed")
    .gte("created_at", startDate.toISOString());

  if (error) throw new Error(`Failed to get usage stats: ${error.message}`);

  const jobs = data ?? [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const job of jobs) {
    const { input, output, model } = extractTokens(job);
    totalInputTokens += input;
    totalOutputTokens += output;
    totalCost += estimateCost(input, output, model);
    if (job.duration_ms != null) {
      durationSum += job.duration_ms;
      durationCount++;
    }
  }

  return {
    totalTokens: totalInputTokens + totalOutputTokens,
    estimatedCost: Math.round(totalCost * 100) / 100,
    avgResponseMs: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
    totalJobs: jobs.length,
  };
}

export async function getTokenUsageByDay(
  days: number
): Promise<TokenUsagePoint[]> {
  const supabase = createServiceRoleClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("notes_ai_jobs")
    .select("input_tokens, output_tokens, model, result_payload, created_at")
    .eq("status", "completed")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to get token usage: ${error.message}`);

  // Group by date
  const dateMap = new Map<string, { input: number; output: number }>();
  for (const job of data ?? []) {
    const date = new Date(job.created_at).toISOString().split("T")[0];
    const entry = dateMap.get(date) ?? { input: 0, output: 0 };
    const tokens = extractTokens(job);
    entry.input += tokens.input;
    entry.output += tokens.output;
    dateMap.set(date, entry);
  }

  // Fill in missing dates
  const result: TokenUsagePoint[] = [];
  const current = new Date(startDate);
  const today = new Date();

  while (current <= today) {
    const dateStr = current.toISOString().split("T")[0];
    const entry = dateMap.get(dateStr) ?? { input: 0, output: 0 };
    result.push({
      date: dateStr,
      inputTokens: entry.input,
      outputTokens: entry.output,
      totalTokens: entry.input + entry.output,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export async function getUsageByTaskType(
  days: number
): Promise<TaskUsageBreakdown[]> {
  const supabase = createServiceRoleClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("notes_ai_jobs")
    .select("task, input_tokens, output_tokens, model, result_payload")
    .eq("status", "completed")
    .gte("created_at", startDate.toISOString());

  if (error) throw new Error(`Failed to get task usage: ${error.message}`);

  const taskMap = new Map<
    AiTask,
    { input: number; output: number; count: number }
  >();

  for (const job of data ?? []) {
    const entry = taskMap.get(job.task as AiTask) ?? {
      input: 0,
      output: 0,
      count: 0,
    };
    const tokens = extractTokens(job);
    entry.input += tokens.input;
    entry.output += tokens.output;
    entry.count++;
    taskMap.set(job.task as AiTask, entry);
  }

  return Array.from(taskMap.entries()).map(([task, entry]) => ({
    task,
    inputTokens: entry.input,
    outputTokens: entry.output,
    totalTokens: entry.input + entry.output,
    jobCount: entry.count,
  }));
}

export async function getAvgResponseTimeByTask(
  days: number
): Promise<TaskResponseTime[]> {
  const supabase = createServiceRoleClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("notes_ai_jobs")
    .select("task, duration_ms")
    .eq("status", "completed")
    .not("duration_ms", "is", null)
    .gte("created_at", startDate.toISOString());

  if (error)
    throw new Error(`Failed to get response times: ${error.message}`);

  const taskMap = new Map<AiTask, { sum: number; count: number }>();

  for (const job of data ?? []) {
    const entry = taskMap.get(job.task as AiTask) ?? { sum: 0, count: 0 };
    entry.sum += job.duration_ms ?? 0;
    entry.count++;
    taskMap.set(job.task as AiTask, entry);
  }

  return Array.from(taskMap.entries()).map(([task, entry]) => ({
    task,
    avgDurationMs: Math.round(entry.sum / entry.count),
    jobCount: entry.count,
  }));
}
