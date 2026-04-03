import { getJobStatus } from "../_shared/jobs.ts";
import { jsonResponse, optionsResponse } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    return await getJobStatus(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled function error.";
    return jsonResponse(500, { error: message });
  }
});
