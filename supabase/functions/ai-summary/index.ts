import { createJobForTask } from "../_shared/jobs.ts";
import { jsonResponse, optionsResponse } from "../_shared/http.ts";
import {
  claimQueuedJobById,
  createServiceClient,
  runSummaryJob,
  setJobBackToQueued,
} from "../_shared/worker-jobs.ts";

type EnqueueResponse = {
  jobId?: string;
  status?: string;
};

async function tryFastPathSummary(jobId: string) {
  const client = createServiceClient();
  const claimedJob = await claimQueuedJobById(client, jobId, "summary");
  if (!claimedJob) return;

  try {
    await runSummaryJob(client, claimedJob);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inline summary attempt failed.";
    const nowIso = new Date().toISOString();
    await setJobBackToQueued(client, claimedJob.id, message, nowIso);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const enqueueResponse = await createJobForTask(req, "summary");

    if (enqueueResponse.status === 202) {
      const payload = (await enqueueResponse.clone().json()) as EnqueueResponse;
      if (payload.jobId) {
        try {
          await tryFastPathSummary(payload.jobId);
        } catch (error) {
          console.error("Fast-path summary attempt failed:", error);
        }
      }
    }

    return enqueueResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled function error.";
    return jsonResponse(500, { error: message });
  }
});
